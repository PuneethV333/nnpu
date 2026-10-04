import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Week } from '../generated/prisma';
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

  async getTimetable(authId: string): Promise<TimetableDayType[]> {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      include: {
        user: true,
      },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    const sectionId = auth.user.sectionId;
    const studentId = auth.userId;
    const studentCombinationId = auth.user.combinationId ?? null;

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
        const filtered = studentId
          ? candidates.filter(
              (s) =>
                !s.combination || s.combination.id === studentCombinationId,
            )
          : candidates;

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
          })),
        };
      }),
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
