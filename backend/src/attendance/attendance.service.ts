import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { Injectable, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
    private readonly prisma: PrismaService,
  ) {}

  async getMy(authId: string, from: string, to: string) {
    this.logger.log('[my]');
    const cacheKey = `attendance:user:${authId}:${from}:${to}`;
    const cached = await this.redis.get(cacheKey);

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

    const attendance = await this.prisma.attendance.findMany({
      where: {
        studentId: auth.userId,
        date: {
          lte: new Date(to),
          gte: new Date(from),
        },
      },
      orderBy: {
        date: 'desc',
      },
    });

    await this.redis.set<typeof attendance>(cacheKey, attendance, 300);

    return {
      data: attendance,
      source: 'db',
    };
  }
}
