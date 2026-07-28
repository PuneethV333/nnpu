import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { FirebaseService } from '@/firebase/firebase.service';

@Injectable()
export class AttendanceReminderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: LoggerService,
    private readonly firebase: FirebaseService,
  ) {}

  @Cron('30 9 * * 1-6') // 9:30 AM, Mon–Sat — adjust to your school week
  async remindPendingAttendance() {
    this.logger.log('[attendance-reminder] running');

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const calendarDay = await this.prisma.academicCalendarDay.findUnique({
      where: { date: today },
    });

    if (!calendarDay || calendarDay.type !== 'Working') {
      this.logger.log('[attendance-reminder] not a working day, skipping');
      return;
    }

    const sections = await this.prisma.section.findMany({
      where: { classTeacherId: { not: null } },
      select: {
        id: true,
        name: true,
        classTeacherId: true,
        class: { select: { name: true } },
        _count: { select: { students: { where: { isActive: true } } } },
      },
    });

    const markedCounts = await this.prisma.attendance.groupBy({
      by: ['sectionId'],
      where: { date: today, status: { not: 'NotMarked' } },
      _count: true,
    });
    const markedMap = new Map(markedCounts.map((m) => [m.sectionId, m._count]));

    const pending = sections.filter((s) => {
      const enrolled = s._count.students;
      const marked = markedMap.get(s.id) ?? 0;
      return enrolled > 0 && marked < enrolled;
    });

    if (pending.length === 0) {
      this.logger.log('[attendance-reminder] nothing pending');
      return;
    }

    await this.prisma.notification.createMany({
      data: pending.map((s) => ({
        userId: s.classTeacherId as string,
        type: 'AttendancePending',
        title: 'Attendance not taken',
        body: `Attendance for ${s.class.name}-${s.name} hasn't been marked yet.`,
      })),
    });

    const teacherIds = pending.map((s) => s.classTeacherId as string);
    const deviceTokens = await this.prisma.deviceToken.findMany({
      where: { userId: { in: teacherIds } },
    });

    const tokensByTeacher = new Map<string, string[]>();
    for (const dt of deviceTokens) {
      const list = tokensByTeacher.get(dt.userId) ?? [];
      list.push(dt.token);
      tokensByTeacher.set(dt.userId, list);
    }

    const results = await Promise.all(
      pending.map((s) => {
        const tokens = tokensByTeacher.get(s.classTeacherId as string) ?? [];
        return this.firebase.sendPush(
          tokens,
          'Attendance not taken',
          `${s.class.name}-${s.name} attendance is pending.`,
        );
      }),
    );

    const allInvalidTokens = results
      .filter((r): r is NonNullable<typeof r> => !!r)
      .flatMap((r) => r.invalidTokens);

    if (allInvalidTokens.length > 0) {
      await this.prisma.deviceToken.deleteMany({
        where: { token: { in: allInvalidTokens } },
      });
      this.logger.log(
        `[attendance-reminder] cleaned up ${allInvalidTokens.length} invalid device tokens`,
      );
    }

    this.logger.log(
      `[attendance-reminder] notified ${pending.length} class teachers`,
    );
  }
}
