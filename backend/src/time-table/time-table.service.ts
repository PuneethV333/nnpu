import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Week } from '../generated/prisma';
import { TimetableDayType } from './type/getTimeTable.type';

@Injectable()
export class TimetableService {
  constructor(private prisma: PrismaService) {}
  private getCurrentWeekDay(): Week {
    const map: Week[] = [
      Week.SUNDAY,
      Week.MONDAY,
      Week.TUESDAY,
      Week.WEDNESDAY,
      Week.THURSDAY,
      Week.FRIDAY,
      Week.SATURDAY,
    ];
    return map[new Date().getDay()];
  }

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
      select: {
        id: true,
        students: {
          take: 1,
          select: { combination: { select: { stream: true } } },
        },
      },
    });

    if (!section) {
      throw new NotFoundException(`Section ${sectionId} not found`);
    }

    const stream = section.students[0]?.combination?.stream;
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
    const fullWeek = await this.getTimetable(authId);
    const today = this.getCurrentWeekDay();

    return fullWeek.find((d) => d.day === today) ?? null;
  }
}
