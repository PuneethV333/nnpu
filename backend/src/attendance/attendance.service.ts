import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceArray, GetMyType } from './types/getMy.type';
import { AttendanceSummary } from './types/summary.type';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async getMy(authId: string, from: string, to: string): Promise<GetMyType> {
    this.logger.log('[my]');

    const cacheKey = `attendance:user:${authId}:${from}:${to}`;
    const cached = await this.redis.get<AttendanceArray>(cacheKey);

    if (cached) {
      return {
        data: cached,
        source: 'redis',
      };
    }

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const attendance: AttendanceArray = await this.prisma.attendance.findMany({
      where: {
        studentId: auth.userId,
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: {
        date: 'desc',
      },
      select: {
        id: true,
        studentId: true,
        sectionId: true,
        date: true,
        status: true,
        markedById: true,
      },
    });

    await this.redis.set<AttendanceArray>(cacheKey, attendance, 300);

    return {
      data: attendance,
      source: 'db',
    };
  }

  async mySummary(authId: string, from: string, to: string) {
    this.logger.log('[my-summary]');

    const cacheKey = `attendance:summary:${authId}:${from}:${to}`;
    const cached = await this.redis.get<AttendanceSummary>(cacheKey);

    if (cached) {
      return { data: cached, source: 'redis' };
    }

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const fromDate = new Date(from);
    const toDate = new Date(to);

    const [workingDays, grouped] = await Promise.all([
      this.prisma.academicCalendarDay.count({
        where: {
          type: 'Working',
          date: { gte: fromDate, lte: toDate },
        },
      }),
      this.prisma.attendance.groupBy({
        by: ['status'],
        where: {
          studentId: auth.userId,
          date: { gte: fromDate, lte: toDate },
        },
        _count: true,
      }),
    ]);

    const counts = { Present: 0, Absent: 0, Late: 0, NotMarked: 0 };

    for (const g of grouped) {
      counts[g.status] = g._count;
    }

    const present = counts.Present + counts.Late;
    const percentage =
      workingDays > 0 ? Number(((present / workingDays) * 100).toFixed(2)) : 0;

    const summary: AttendanceSummary = {
      from,
      to,
      workingDays,
      present: counts.Present,
      absent: counts.Absent,
      late: counts.Late,
      notMarked: counts.NotMarked,
      percentage,
    };

    await this.redis.set<AttendanceSummary>(cacheKey, summary, 300);

    return { data: summary, source: 'db' };
  }

  async getRoster(sectionId: string, date: string) {
    this.logger.log('[roster]');

    const dateObj = new Date(date);

    const calendarDay = await this.prisma.academicCalendarDay.findUnique({
      where: { date: dateObj },
    });

    if (!calendarDay || calendarDay.type !== 'Working') {
      throw new BadRequestException(
        `Cannot mark attendance on a ${calendarDay?.type ?? 'undefined'} day`,
      );
    }

    const students = await this.prisma.user.findMany({
      where: { sectionId, role: 'Student', isActive: true },
      select: {
        id: true,
        details: { select: { name: true, profilePic: true } },
      },
    });

    if (students.length === 0) {
      throw new BadRequestException('No students found in this section');
    }

    await this.prisma.attendance.createMany({
      data: students.map((s) => ({
        studentId: s.id,
        sectionId,
        date: dateObj,
      })),
      skipDuplicates: true,
    });

    const roster = await this.prisma.attendance.findMany({
      where: { sectionId, date: dateObj },
      include: {
        student: {
          select: {
            id: true,
            details: { select: { name: true, profilePic: true } },
          },
        },
      },
      orderBy: { student: { details: { name: 'asc' } } },
    });

    return { data: roster, source: 'db' };
  }

  async markAttendance(dto: MarkAttendanceDto, authId: string) {
    this.logger.log('[mark]');

    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true },
    });

    if (!auth) {
      throw new UnauthorizedException('User not found');
    }

    const teacherId = auth.userId;
    const dateObj = new Date(dto.date);

    const calendarDay = await this.prisma.academicCalendarDay.findUnique({
      where: { date: dateObj },
    });

    if (!calendarDay || calendarDay.type !== 'Working') {
      throw new BadRequestException(
        `Cannot mark attendance on a ${calendarDay?.type ?? 'undefined'} day`,
      );
    }

    const existingRows = await this.prisma.attendance.findMany({
      where: {
        sectionId: dto.sectionId,
        date: dateObj,
        studentId: { in: dto.entries.map((e) => e.studentId) },
      },
    });

    const rowMap = new Map(existingRows.map((r) => [r.studentId, r]));

    for (const entry of dto.entries) {
      const existing = rowMap.get(entry.studentId);
      if (existing?.markedAt) {
        const hoursSinceMarked =
          (Date.now() - existing.markedAt.getTime()) / (1000 * 60 * 60);
        if (hoursSinceMarked > 24) {
          throw new ForbiddenException(
            `Attendance for ${dto.date} is locked (marked more than 24 hours ago)`,
          );
        }
      }
    }

    const now = new Date();

    await this.prisma.$transaction(
      dto.entries.map((entry) => {
        const existing = rowMap.get(entry.studentId);
        return this.prisma.attendance.upsert({
          where: {
            studentId_date: { studentId: entry.studentId, date: dateObj },
          },
          update: {
            status: entry.status,
            markedById: teacherId,
            markedAt: existing?.markedAt ?? now,
          },
          create: {
            studentId: entry.studentId,
            sectionId: dto.sectionId,
            date: dateObj,
            status: entry.status,
            markedById: teacherId,
            markedAt: now,
          },
        });
      }),
    );

    await Promise.all(
      dto.entries.map((e) =>
        this.redis.del(`attendance:summary:${e.studentId}`),
      ),
    );

    return { message: `Attendance marked for ${dto.entries.length} students` };
  }

  async getAttendanceStatus(sectionId: string, date: string) {
    this.logger.log('[attendance-status]');

    const dateObj = new Date(date);

    const calendarDay = await this.prisma.academicCalendarDay.findUnique({
      where: { date: dateObj },
    });

    if (!calendarDay || calendarDay.type !== 'Working') {
      throw new BadRequestException(
        `Cannot mark attendance on a ${calendarDay?.type ?? 'undefined'} day`,
      );
    }

    const rows = await this.prisma.attendance.findMany({
      where: { sectionId, date: dateObj },
      select: { status: true, markedAt: true },
    });

    const isMarked =
      rows.length > 0 && rows.every((r) => r.status !== 'NotMarked');
    const firstMarkedAt = rows.find((r) => r.markedAt)?.markedAt ?? null;

    const isLocked = firstMarkedAt
      ? Date.now() - firstMarkedAt.getTime() > 24 * 60 * 60 * 1000
      : false;

    return {
      data: { isMarked, isLocked, markedAt: firstMarkedAt },
    };
  }
}
