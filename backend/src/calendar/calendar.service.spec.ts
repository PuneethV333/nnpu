import { Test, TestingModule } from '@nestjs/testing';
import { CalendarService } from './calendar.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';
import type { GenerateCalendarDto } from './dto/generate-calendar.dto';

type CalendarRow = {
  date: Date;
  type: string;
  label: string | null;
};

type UpsertArg = {
  where: { date: Date };
  create?: CalendarRow;
  update?: { type: string; label: string | null };
};

type FindManyArg = {
  where: { date: { gte: Date; lte: Date } };
  select?: unknown;
};

describe('CalendarService', () => {
  let service: CalendarService;
  let prisma: {
    academicCalendarDay: {
      findMany: jest.Mock<Promise<CalendarRow[]>, [FindManyArg]>;
      upsert: jest.Mock<Promise<unknown>, [UpsertArg]>;
    };
    $transaction: jest.Mock<Promise<unknown>, [unknown[]]>;
  };
  let redis: { delPattern: jest.Mock<Promise<number>, [string]> };

  const dto = (
    overrides: GenerateCalendarDto['overrides'] = [],
  ): GenerateCalendarDto => ({
    year: 2026,
    overrides,
  });

  /** Type of the day the service decided on, keyed by ISO date. */
  const decidedTypes = (): Map<string, string> => {
    const map = new Map<string, string>();
    for (const call of prisma.academicCalendarDay.upsert.mock.calls) {
      const arg = call[0] as {
        where: { date: Date };
        create?: UpsertArg['create'];
      };
      const iso = arg.where.date.toISOString().split('T')[0];
      map.set(iso, arg.create?.type ?? '?');
    }
    return map;
  };

  beforeEach(async () => {
    // Note: @types/jest@30 generics are <TReturn, TArgs extends any[]>.
    // mockImplementation returns `this`, so chaining keeps the generic types
    // (whereas mockResolvedValue resolves to an untyped overload).
    prisma = {
      academicCalendarDay: {
        findMany: jest
          .fn<Promise<CalendarRow[]>, [FindManyArg]>()
          .mockImplementation(() => Promise.resolve([])),
        upsert: jest
          .fn<Promise<unknown>, [UpsertArg]>()
          .mockImplementation(() => Promise.resolve({})),
      },
      $transaction: jest
        .fn<Promise<unknown>, [unknown[]]>()
        .mockImplementation(() => Promise.resolve([])),
    };
    redis = {
      delPattern: jest
        .fn<Promise<number>, [string]>()
        .mockImplementation(() => Promise.resolve(1)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CalendarService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(CalendarService);
  });

  describe('Saturday is a working day', () => {
    it('marks Saturday as Working', async () => {
      await service.generateYear(dto());

      // 2026-01-03 is a Saturday.
      expect(decidedTypes().get('2026-01-03')).toBe('Working');
    });

    it('keeps Sunday as Weekend', async () => {
      await service.generateYear(dto());

      // 2026-01-04 is a Sunday.
      expect(decidedTypes().get('2026-01-04')).toBe('Weekend');
    });

    it('keeps weekdays as Working', async () => {
      await service.generateYear(dto());

      expect(decidedTypes().get('2026-01-05')).toBe('Working'); // Monday
    });
  });

  describe('generateYear preserves curated days', () => {
    it('keeps an existing manual override instead of overwriting it', async () => {
      // Regression: the upsert wrote freshly computed defaults over every row,
      // so regenerating a year silently discarded admin overrides.
      prisma.academicCalendarDay.findMany.mockResolvedValue([
        {
          date: new Date('2026-01-07T00:00:00.000Z'),
          type: 'Holiday',
          label: 'Founder Day',
        },
      ]);

      await service.generateYear(dto());

      const arg = prisma.academicCalendarDay.upsert.mock.calls.find(
        (c) =>
          (c[0] as { where: { date: Date } }).where.date.toISOString() ===
          '2026-01-07T00:00:00.000Z',
      )?.[0] as UpsertArg;

      expect(arg.create?.type).toBe('Holiday');
    });

    it('lets a request override win over an existing row', async () => {
      prisma.academicCalendarDay.findMany.mockResolvedValue([
        {
          date: new Date('2026-01-07T00:00:00.000Z'),
          type: 'Working',
          label: null,
        },
      ]);

      await service.generateYear(
        dto([{ date: '2026-01-07', type: 'Exam', label: 'Unit 2' }]),
      );

      const arg = prisma.academicCalendarDay.upsert.mock.calls.find(
        (c) =>
          (c[0] as { where: { date: Date } }).where.date.toISOString() ===
          '2026-01-07T00:00:00.000Z',
      )?.[0] as UpsertArg;

      expect(arg.create?.type).toBe('Exam');
    });
  });

  describe('cache invalidation', () => {
    it('clears cached ranges after generateYear', async () => {
      await service.generateYear(dto());

      expect(redis.delPattern).toHaveBeenCalledWith('range:*');
    });

    it('clears cached ranges after overrideDay', async () => {
      await service.overrideDay('2026-01-07', 'Holiday', 'Founder Day');

      // Without this the previous day stayed visible for up to an hour.
      expect(redis.delPattern).toHaveBeenCalledWith('range:*');
    });

    it('does not fail the write when cache invalidation fails', async () => {
      redis.delPattern.mockRejectedValue(new Error('redis down'));

      await expect(
        service.overrideDay('2026-01-07', 'Holiday'),
      ).resolves.toBeDefined();
    });
  });
});
