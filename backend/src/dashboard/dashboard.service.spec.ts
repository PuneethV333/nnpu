/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
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
            enrollmentSubmission: { count: jest.fn() },
            enrollmentDrive: { count: jest.fn() },
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

  it('aggregates and returns the admin dashboard', async () => {
    (redis.get as jest.Mock).mockResolvedValue(null);
    (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
      date: new Date(),
      type: 'Working',
      label: null,
    });
    (prisma.user.count as jest.Mock).mockResolvedValue(100);
    (prisma.attendance.count as jest.Mock).mockResolvedValue(80);
    (prisma.enrollmentSubmission.count as jest.Mock).mockResolvedValue(5);
    (prisma.enrollmentDrive.count as jest.Mock).mockResolvedValue(2);
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
    expect(result.pendingEnrollments).toBe(5);
    expect(result.openDrives).toBe(2);
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
    (prisma.enrollmentSubmission.count as jest.Mock).mockResolvedValue(0);
    (prisma.enrollmentDrive.count as jest.Mock).mockResolvedValue(0);
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
