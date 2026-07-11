import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AttendanceArray, GetMyType } from './types/getMy.type';
import { AttendanceSummary } from './types/summary.type';

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
}
