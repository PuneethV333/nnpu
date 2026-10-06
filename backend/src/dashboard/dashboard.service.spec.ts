/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { toDayKey, zonedToday } from '@/common/utils/date.util';
import { RedisService } from '@/redis/redis.service';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            academicCalendarDay: { findUnique: jest.fn(), findMany: jest.fn() },
            user: { count: jest.fn() },
            attendance: { count: jest.fn() },
            invoice: { count: jest.fn(), aggregate: jest.fn() },
          },
        },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(DashboardService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Primes every aggregate the service awaits, so a test can focus on the date
   * rather than rediscovering the dependency list.
   */
  const primeAggregates = () => {
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.attendance.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: 0, paidAmount: 0 },
    });
    (prisma.academicCalendarDay.findMany as jest.Mock).mockResolvedValue([]);
  };

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('returns the cached dashboard without touching Prisma', async () => {
    const cached = {
      today: { date: '2026-07-31', type: 'Working', label: null },
    } as never;
    (redis.get as jest.Mock).mockResolvedValue(cached);
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockRejectedValue(
      new Error('should not touch prisma'),
    );

    const result = await service.getAdminDashboard();

    expect(result).toBe(cached);
    expect(prisma.academicCalendarDay.findUnique).not.toHaveBeenCalled();
  });

  /**
   * The regression: "today" was derived from `new Date()` truncated to UTC
   * midnight, which is only the school day while UTC and IST share a date.
   * IST is UTC+5:30, so 00:00-05:30 local time kept the dashboard on the
   * previous day.
   */
  it('queries the school day, not the UTC day, during the IST midnight window', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    primeAggregates();
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: zonedToday(),
      type: 'Working',
      label: null,
    });

    // 02:00 IST on 2026-10-04 is 2026-10-03 20:30 UTC — inside the window.
    const clock = new Date('2026-10-03T20:30:00.000Z');
    jest.useFakeTimers().setSystemTime(clock);

    try {
      const result = await service.getAdminDashboard();

      expect(result.today.date).toBe('2026-10-04');

      // Two-step cast: Prisma's `findUnique` is a generic overload, so it does
      // not overlap a jest.Mock directly.
      const findUnique = prisma.academicCalendarDay
        .findUnique as unknown as jest.Mock<
        unknown,
        [{ where: { date: Date } }]
      >;
      expect(findUnique.mock.calls[0][0].where.date.toISOString()).toBe(
        '2026-10-04T00:00:00.000Z',
      );
    } finally {
      jest.useRealTimers();
    }
  });

  it('includes the school day in the cache key so the rollover is immediate', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    primeAggregates();
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: zonedToday(),
      type: 'Working',
      label: null,
    });

    await service.getAdminDashboard();

    // Otherwise the 300s TTL serves the previous day's figures for up to five
    // minutes after local midnight.
    expect(redis.get).toHaveBeenCalledWith(
      expect.stringContaining(`dashboard:admin:${toDayKey(zonedToday())}`),
    );
  });

  it('aggregates and returns the admin dashboard', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: new Date(),
      type: 'Working',
      label: null,
    });
    // Students and teachers are both `user.count`, distinguished only by the
    // `role` filter. Mocking by value alone would make both resolve to the same
    // number and the teacher assertion below would pass for the wrong reason.
    (prisma.user.count as jest.Mock).mockImplementation(
      ({ where }: { where?: { role?: string } }) =>
        Promise.resolve(where?.role === 'Teacher' ? 6 : 100),
    );
    (prisma.attendance.count as jest.Mock).mockResolvedValue(80);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(3);
    (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: 10000, paidAmount: 2000 },
    });
    (prisma.academicCalendarDay.findMany as jest.Mock).mockResolvedValue([
      { date: new Date(), type: 'Holiday', label: 'Independence Day' },
    ]);

    const result = await service.getAdminDashboard();

    expect(result.today.type).toBe('Working');
    expect(result.attendanceToday).toEqual({
      totalStudents: 100,
      marked: 80,
      percentage: 80,
    });
    expect(result.totalTeachers).toBe(6);
    expect(result.fees).toEqual({ pendingInvoices: 3, amountPending: 8000 });
    expect(result.upcomingEvents).toHaveLength(1);
    expect(result.upcomingEvents[0].type).toBe('Holiday');
  });

  it('returns zero attendance percentage when no active students', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: new Date(),
      type: 'Working',
      label: null,
    });
    (prisma.user.count as jest.Mock).mockResolvedValue(0);
    (prisma.attendance.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.count as jest.Mock).mockResolvedValue(0);
    (prisma.invoice.aggregate as jest.Mock).mockResolvedValue({
      _sum: { totalAmount: null, paidAmount: null },
    });
    (prisma.academicCalendarDay.findMany as jest.Mock).mockResolvedValue([]);

    const result = await service.getAdminDashboard();

    expect(result.attendanceToday).toEqual({
      totalStudents: 0,
      marked: 0,
      percentage: 0,
    });
    expect(result.fees).toEqual({ pendingInvoices: 0, amountPending: 0 });
  });
});
