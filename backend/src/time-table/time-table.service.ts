import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, Week } from '../generated/prisma';
import { TimetableDayType } from './type/getTimeTable.type';
import { zonedIsoWeekday } from '@/common/utils/date.util';

/** ISO weekday (1 = Monday) to the `Week` enum, which has no Sunday. */
const WEEK_BY_ISO_DAY: readonly Week[] = [
  Week.MONDAY,
  Week.TUESDAY,
  Week.WEDNESDAY,
  Week.THURSDAY,
  Week.FRIDAY,
  Week.SATURDAY,
];

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}

  /**
   * Today in the school timezone, or `null` on Sunday.
   *
   * Previously this indexed a `[MONDAY..SATURDAY]` array with `Date.getDay()`,
   * which is 0-based with Sunday first. Every day was therefore wrong: Monday
   * returned Tuesday's schedule, Friday returned Saturday's, Saturday returned
   * `undefined`, and Sunday returned Monday's.
   */
  private getCurrentWeekDay(): Week | null {
    const isoWeekday = zonedIsoWeekday();

    // `Week` has no SUNDAY member and the school does not run on Sundays.
    if (isoWeekday === 7) return null;

    return WEEK_BY_ISO_DAY[isoWeekday - 1] ?? null;
  }

  /**
   * `Period.startTime` / `endTime` are `@db.Time`, which has no timezone — it
   * is a wall-clock time. Prisma returns them as a Date anchored at
   * 1970-01-01T00:00:00Z, so the UTC slice below yields exactly the stored
   * wall-clock value (verified: a stored 08:00 renders as "08:00").
   *
   * Do NOT "fix" this by converting to the school timezone — that would shift
   * every period by +05:30 and render 08:00 as 13:30.
   */
  private formatTime(date: Date): string {
    return date.toISOString().slice(11, 16);
  }

  /**
   * Resolves the caller's `User` row from their authId in a single query. The
   * full row is returned (not just `{ userId, role }`) because the student path
   * needs `sectionId` and `combinationId`; a second `user.findUnique` for fields
   * already loaded here is the redundant-query bug this codebase has hit before.
   */
  private async resolveUser(authId: string) {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      include: { user: true },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    return auth.user;
  }

  async getTimetable(authId: string): Promise<TimetableDayType[]> {
    const user = await this.resolveUser(authId);

    // Teachers are not attached to a section the way a student is —
    // `User.sectionId` is the "StudentSection" relation and is always null for
    // staff, so the student path below threw `NotFoundException` for every
    // teacher and their home page showed "no classes" permanently. A teacher's
    // day is the set of slots they are *assigned to teach* instead.
    if (user.role === Role.Teacher) {
      return this.getTeacherTimetable(user.id);
    }

    return this.getStudentTimetable(user.sectionId, user.combinationId ?? null);
  }

  private async getStudentTimetable(
    sectionId: string | null,
    studentCombinationId: string | null,
  ): Promise<TimetableDayType[]> {
    if (!sectionId) {
      throw new NotFoundException('user has no associated section');
    }

    const section = await this.prisma.section.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    // The stream comes from the caller's own combination. It used to be inferred
    // from `section.students take: 1` with no ordering — i.e. whichever student
    // the database happened to return first. A section holds both Science and
    // Commerce students (that is what Combination exists for), so the periods
    // shown depended on non-deterministic row order.
    const combination = studentCombinationId
      ? await this.prisma.combination.findUnique({
          where: { id: studentCombinationId },
          select: { stream: true },
        })
      : null;

    const stream = combination?.stream;
    if (!stream) {
      throw new NotFoundException(
        `Could not resolve stream for section ${sectionId}`,
      );
    }

    const [periods, slots, sectionSubjects] = await Promise.all([
      this.prisma.period.findMany({
        where: { stream },
        orderBy: { order: 'asc' },
      }),
      this.prisma.timetableSlot.findMany({
        where: { sectionId },
        include: {
          subject: { select: { id: true, name: true } },
          teacher: { select: { details: { select: { name: true } } } },
          combination: { select: { id: true, name: true } },
        },
      }),
      this.prisma.sectionSubject.findMany({
        where: { sectionId },
        include: {
          teacher: { select: { details: { select: { name: true } } } },
        },
      }),
    ]);

    const defaultTeacherBySubject = new Map<string, string | null>(
      sectionSubjects.map((ss) => [
        ss.subjectId,
        ss.teacher?.details?.name ?? null,
      ]),
    );

    const slotsByKey = new Map<string, typeof slots>();
    for (const s of slots) {
      const key = `${s.day}-${s.periodId}`;
      const arr = slotsByKey.get(key) ?? [];
      arr.push(s);
      slotsByKey.set(key, arr);
    }

    const days = Object.values(Week);

    return days.map((day) => ({
      day,
      slots: periods.map((period) => {
        if (period.isBreak) {
          return {
            periodId: period.id,
            order: period.order,
            startTime: this.formatTime(period.startTime),
            endTime: this.formatTime(period.endTime),
            isBreak: true,
            label: period.label,
            options: [],
          };
        }

        const key = `${day}-${period.id}`;
        const candidates = slotsByKey.get(key) ?? [];

        // Slots with no combination (i.e. not a split/elective period) are
        // common to everyone and always pass through. Slots tied to a
        // combination are narrowed down to this student's own combination.
        // A student always has a combination here, so there is no "unknown
        // student" case to fall back to.
        const filtered = candidates.filter(
          (s) => !s.combination || s.combination.id === studentCombinationId,
        );

        return {
          periodId: period.id,
          order: period.order,
          startTime: this.formatTime(period.startTime),
          endTime: this.formatTime(period.endTime),
          isBreak: false,
          label: null,
          options: filtered.map((s) => ({
            subject: s.subject.name,
            teacher:
              s.teacher?.details?.name ??
              defaultTeacherBySubject.get(s.subjectId) ??
              null,
            language: s.language,
            combination: s.combination?.name ?? null,
            // Always null on the student view: the section is implied.
            section: null,
          })),
        };
      }),
    }));
  }

  /**
   * A teacher's weekly timetable: the slots they are actually assigned to teach.
   *
   * Ownership of a slot is resolved the same way the student view resolves the
   * teacher shown next to a subject: `TimetableSlot.teacherId` is the explicit
   * per-slot assignment, and when it is null the section's `SectionSubject` row
   * (subject-level staffing) names the effective teacher. Without the fallback,
   * a slot staffed only through `SectionSubject` would leave its teacher with an
   * empty day.
   *
   * Unlike the student view, only periods the teacher teaches are returned —
   * free periods and breaks are not "classes" for them.
   */
  private async getTeacherTimetable(
    userId: string,
  ): Promise<TimetableDayType[]> {
    const assignments = await this.prisma.sectionSubject.findMany({
      where: { teacherId: userId },
      select: { sectionId: true, subjectId: true },
    });

    const assignedKeys = new Set(
      assignments.map((a) => `${a.sectionId}:${a.subjectId}`),
    );
    const assignedSectionIds = [
      ...new Set(assignments.map((a) => a.sectionId)),
    ];

    const [periods, slots] = await Promise.all([
      this.prisma.period.findMany({ orderBy: { order: 'asc' } }),
      this.prisma.timetableSlot.findMany({
        where: {
          OR: [
            { teacherId: userId },
            // Candidates for the subject-level fallback. Narrowed to the exact
            // section *and* subject in JS below: Prisma cannot compare two
            // columns inside a `some` filter, so a section-only match here
            // would also pull in subjects this teacher does not teach.
            { teacherId: null, sectionId: { in: assignedSectionIds } },
          ],
        },
        include: {
          subject: { select: { id: true, name: true } },
          section: { select: { name: true } },
          combination: { select: { id: true, name: true } },
        },
      }),
    ]);

    const mine = slots.filter(
      (s) =>
        s.teacherId === userId ||
        assignedKeys.has(`${s.sectionId}:${s.subjectId}`),
    );

    const slotsByKey = new Map<string, typeof mine>();
    for (const slot of mine) {
      const key = `${slot.day}:${slot.periodId}`;
      const arr = slotsByKey.get(key) ?? [];
      arr.push(slot);
      slotsByKey.set(key, arr);
    }

    return Object.values(Week).map((day) => ({
      day,
      slots: periods
        .map((period) => {
          const daySlots = slotsByKey.get(`${day}:${period.id}`) ?? [];
          if (daySlots.length === 0) return null;

          return {
            periodId: period.id,
            order: period.order,
            startTime: this.formatTime(period.startTime),
            endTime: this.formatTime(period.endTime),
            isBreak: false,
            label: null,
            options: [...daySlots]
              .sort(
                (a, b) =>
                  a.section.name.localeCompare(b.section.name) ||
                  a.subject.name.localeCompare(b.subject.name),
              )
              .map((s) => ({
                subject: s.subject.name,
                // A teacher does not need to be told their own name; the
                // useful detail is which class to walk into.
                teacher: null,
                language: s.language,
                combination: s.combination?.name ?? null,
                section: s.section.name,
              })),
          };
        })
        .filter((slot): slot is NonNullable<typeof slot> => slot !== null),
    }));
  }

  async getTimetableToday(authId: string): Promise<TimetableDayType | null> {
    const today = this.getCurrentWeekDay();

    // Sunday: the school does not run, so there is no timetable to show.
    if (!today) {
      return null;
    }

    const fullWeek = await this.getTimetable(authId);

    return fullWeek.find((d) => d.day === today) ?? null;
  }
}
