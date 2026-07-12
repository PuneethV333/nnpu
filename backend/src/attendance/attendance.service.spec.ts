/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: jest.Mocked<PrismaService>;
  let redis: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: {
            auth: { findUnique: jest.fn() },
            attendance: {
              findMany: jest.fn(),
              createMany: jest.fn(),
              groupBy: jest.fn(),
              $transaction: jest.fn(),
            },
            academicCalendarDay: { findUnique: jest.fn(), count: jest.fn() },
            user: { findMany: jest.fn() },
            $transaction: jest.fn(),
          },
        },
        {
          provide: RedisService,
          useValue: { get: jest.fn(), set: jest.fn(), del: jest.fn() },
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

    service = module.get(AttendanceService);
    prisma = module.get(PrismaService);
    redis = module.get(RedisService);
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getMy', () => {
    it('returns cached data on cache hit, skips DB', async () => {
      const cached = [{ id: 'a1' }];
      (redis.get as jest.Mock).mockResolvedValue(cached);

      const result = await service.getMy('auth1', '2026-07-01', '2026-07-31');

      expect(result).toEqual({ data: cached, source: 'redis' });
      expect(prisma.auth.findUnique).not.toHaveBeenCalled();
    });

    it('throws UnauthorizedException if auth not found', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getMy('missing', '2026-07-01', '2026-07-31'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('mySummary', () => {
    it('computes percentage correctly, counting Late as present', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'student1',
      });
      (prisma.academicCalendarDay.count as jest.Mock).mockResolvedValue(20);
      (prisma.attendance.groupBy as jest.Mock).mockResolvedValue([
        { status: 'Present', _count: 15 },
        { status: 'Absent', _count: 3 },
        { status: 'Late', _count: 2 },
      ]);

      const result = await service.mySummary(
        'auth1',
        '2026-07-01',
        '2026-07-31',
      );

      expect(result.data).toEqual({
        from: '2026-07-01',
        to: '2026-07-31',
        workingDays: 20,
        present: 15,
        absent: 3,
        late: 2,
        notMarked: 0,
        percentage: 85, // (15+2)/20 * 100
      });
    });

    it('returns 0 percentage when there are no working days', async () => {
      (redis.get as jest.Mock).mockResolvedValue(null);
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'student1',
      });
      (prisma.academicCalendarDay.count as jest.Mock).mockResolvedValue(0);
      (prisma.attendance.groupBy as jest.Mock).mockResolvedValue([]);

      const result = await service.mySummary(
        'auth1',
        '2026-07-01',
        '2026-07-02',
      );

      expect(result.data.percentage).toBe(0);
    });
  });

  describe('getAttendanceStatus', () => {
    it('throws BadRequestException on a non-working day', async () => {
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Holiday',
      });

      await expect(
        service.getAttendanceStatus('section1', '2026-07-10'),
      ).rejects.toThrow(BadRequestException);
    });

    it('reports isMarked=false when no rows exist yet', async () => {
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getAttendanceStatus(
        'section1',
        '2026-07-09',
      );

      expect(result.data.isMarked).toBe(false);
      expect(result.data.isLocked).toBe(false);
    });

    it('reports isLocked=true when marked more than 24h ago', async () => {
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([
        {
          status: 'Present',
          markedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      ]);

      const result = await service.getAttendanceStatus(
        'section1',
        '2026-07-09',
      );

      expect(result.data.isMarked).toBe(true);
      expect(result.data.isLocked).toBe(true);
    });
  });

  describe('markAttendance', () => {
    it('throws BadRequestException on a non-working day', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Holiday',
      });

      await expect(
        service.markAttendance(
          {
            sectionId: 's1',
            date: '2026-07-10',
            entries: [{ studentId: 'st1', status: 'Present' }],
          },
          'auth1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if a row was marked more than 24h ago', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([
        {
          studentId: 'st1',
          markedAt: new Date(Date.now() - 25 * 60 * 60 * 1000),
        },
      ]);

      await expect(
        service.markAttendance(
          {
            sectionId: 's1',
            date: '2026-07-09',
            entries: [{ studentId: 'st1', status: 'Absent' }],
          },
          'auth1',
        ),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
