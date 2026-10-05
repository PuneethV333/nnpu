import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { Injectable } from '@nestjs/common';
import { GenerateCalendarDto } from './dto/generate-calendar.dto';
import { DayType } from '@/generated/prisma';
import { range } from './types/range.type';
import { RedisService } from '@/redis/redis.service';
import { BadRequestException } from '@nestjs/common';

/** See getRange: bounds the `range:*` cache keyspace. */
const MAX_RANGE_DAYS = 732;

@Injectable()
export class CalendarService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly logger: LoggerService,
  ) {}

  async generateYear(dto: GenerateCalendarDto) {
    this.logger.log('[generate-year]');
    const overrideMap = new Map(
      dto.overrides.map((o) => [
        new Date(o.date).toISOString().split('T')[0],
        o,
      ]),
    );
    const start = new Date(Date.UTC(dto.year, 0, 1));
    const end = new Date(Date.UTC(dto.year, 11, 31));

    // Existing rows are the source of truth for days an admin has already
    // curated. Previously the upsert wrote freshly computed defaults over every
    // row, so regenerating a year silently discarded manual overrides unless the
    // caller happened to resend them.
    const existing = await this.prisma.academicCalendarDay.findMany({
      where: { date: { gte: start, lte: end } },
      select: { date: true, type: true, label: true },
    });
    const existingMap = new Map(
      existing.map((row) => [row.date.toISOString().split('T')[0], row]),
    );

    const days: { date: Date; type: DayType; label: string | null }[] = [];

    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = d.toISOString().split('T')[0];

      // Saturday is a working day: the school week, the `Week` enum and the
      // attendance-reminder cron all include it, so only Sunday is a weekend.
      const isWeekend = d.getUTCDay() === 0;

      const override = overrideMap.get(key);
      const prior = existingMap.get(key);

      days.push({
        date: new Date(d),
        type:
          override?.type ?? prior?.type ?? (isWeekend ? 'Weekend' : 'Working'),
        label: override?.label ?? prior?.label ?? null,
      });
    }

    await this.prisma.$transaction(
      days.map((day) =>
        this.prisma.academicCalendarDay.upsert({
          where: { date: day.date },
          update: { type: day.type, label: day.label },
          create: day,
        }),
      ),
    );

    await this.invalidateRangeCache();

    return {
      message: `Calendar generated for ${dto.year}`,
      totalDays: days.length,
    };
  }

  async getRange(from: string, to: string) {
    this.logger.log('[get-range]');

    // The cache key is built from the raw from/to pair, so every distinct pair
    // is a distinct Redis entry. Format validation (CalendarRangeQueryDto) caps
    // the shape of a key, but not how many there are — without this, any
    // authenticated user could mint an entry per request and grow the keyspace
    // without bound. Two years covers a full academic year with room to spare;
    // the app only ever asks for a month or a year (getMonthRange/getYearRange).
    const fromDate = new Date(from);
    const toDate = new Date(to);
    const spanDays = Math.round(
      (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (Number.isNaN(spanDays)) {
      throw new BadRequestException('from and to must be valid dates');
    }

    if (spanDays > MAX_RANGE_DAYS) {
      throw new BadRequestException(
        `Range too large: ${spanDays} days (max ${MAX_RANGE_DAYS}).`,
      );
    }

    const cacheKey = `range:${from}:${to}`;

    const cached = await this.redis.get<range[]>(cacheKey);

    if (cached) {
      return { data: cached, source: 'redis' };
    }

    const data = await this.prisma.academicCalendarDay.findMany({
      where: {
        date: {
          gte: new Date(from),
          lte: new Date(to),
        },
      },
      orderBy: { date: 'asc' },
    });

    const result: range[] = data.map((x) => {
      return {
        id: x.id,
        date: x.date,
        type: x.type,
        label: x.label,
        createdAt: x.createdAt,
        updatedAt: x.updatedAt,
      };
    });

    await this.redis.set<range[]>(cacheKey, result);

    return { data: result, source: 'db' };
  }

  async overrideDay(date: string, type: DayType, label?: string) {
    this.logger.log('[override-day]');
    const result = await this.prisma.academicCalendarDay.upsert({
      where: { date: new Date(date) },
      update: { type, label: label ?? null },
      create: { date: new Date(date), type, label: label ?? null },
    });

    // Without this, getRange kept serving the pre-override day for up to an
    // hour, so an admin's correction appeared not to save.
    await this.invalidateRangeCache();

    return result;
  }

  /**
   * Drops every cached `range:*` entry.
   *
   * getRange caches on the exact `from`/`to` pair the client asked for, so the
   * set of affected keys cannot be derived from a single write — they have to be
   * swept. Reads are rare compared to admin edits, so this is cheaper than
   * trying to track which ranges cover a changed date.
   */
  private async invalidateRangeCache(): Promise<void> {
    try {
      await this.redis.delPattern('range:*');
    } catch (err) {
      // Stale cache is preferable to a failed write.
      this.logger.warn(
        `[calendar] could not invalidate range cache: ${(err as Error).message}`,
      );
    }
  }
}
