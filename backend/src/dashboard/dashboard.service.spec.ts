/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { toDayKey, zonedToday } from '@/common/utils/date.util';

describe('DashboardService', () => {
  let service: DashboardService;
  let prisma: jest.Mocked<PrismaService>;

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
      ],
    }).compile();

    service = module.get(DashboardService);
    prisma = module.get(PrismaService);
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

  /**
   * The regression this guards: the result used to be cached for 300s under
   * `dashboard:admin:<day>` and NOTHING invalidated it. Every field is an
   * aggregate over a table written elsewhere — pass-out, CSV import, activate/
   * deactivate, transfer, attendance marking, Razorpay payments, calendar
   * overrides, fee-structure edits — so an admin could pass out 250 students
   * and still read the old total for five minutes, with nothing visibly wrong.
   *
   * Asserted as "always recomputes", because the service no longer injects
   * RedisService: re-adding a cache would fail this spec's DI graph.
   */
  it('always recomputes rather than serving a cached aggregate', async () => {
    primeAggregates();
    (prisma.user.count as jest.Mock).mockResolvedValue(7);
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: zonedToday(),
      type: 'Working',
      label: null,
    });

    const first = await service.getAdminDashboard();

    // Whatever the underlying counts become, the next read reflects it.
    (prisma.user.count as jest.Mock).mockResolvedValue(250);
    const second = await service.getAdminDashboard();

    expect(first.attendanceToday.totalStudents).toBe(7);
    expect(second.attendanceToday.totalStudents).toBe(250);
    expect(prisma.academicCalendarDay.findUnique).toHaveBeenCalledTimes(2);
  });

  /**
   * The regression: "today" was derived from `new Date()` truncated to UTC
   * midnight, which is only the school day while UTC and IST share a date.
   * IST is UTC+5:30, so 00:00-05:30 local time kept the dashboard on the
   * previous day.
   */
  it('queries the school day, not the UTC day, during the IST midnight window', async () => {
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

  it('always reflects the current school day, so there is no rollover window', async () => {
    // This used to be a cache-key assertion: the day was part of the key so the
    // 300s TTL could not serve yesterday's figures for five minutes past local
    // midnight. With no cache the window is gone entirely, which is the
    // stronger version of the same guarantee.
    primeAggregates();
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: zonedToday(),
      type: 'Working',
      label: null,
    });

    const result = await service.getAdminDashboard();

    expect(result.today.date).toBe(toDayKey(zonedToday()));
  });

  it('aggregates and returns the admin dashboard', async () => {
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
