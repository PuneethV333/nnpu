/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { AttendanceService } from './attendance.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { RedisService } from '@/redis/redis.service';

const WORKING_DAY = { date: new Date(), type: 'Working', label: null };

describe('AttendanceService', () => {
  let service: AttendanceService;
  let prisma: jest.Mocked<PrismaService>;

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AttendanceService,
        {
          provide: PrismaService,
          useValue: {
            auth: { findUnique: jest.fn() },
            section: { findFirst: jest.fn() },
            academicCalendarDay: { findUnique: jest.fn() },
            user: { findMany: jest.fn() },
            attendance: {
              findMany: jest.fn(),
              createMany: jest.fn(),
              upsert: jest.fn(),
            },
            $transaction: jest.fn(),
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
            get: jest.fn().mockResolvedValue(null),
            set: jest.fn(),
            delPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get(AttendanceService);
    prisma = module.get(PrismaService);
  };

  beforeEach(async () => {
    await buildModule();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('section authorization', () => {
    const asTeacher = () =>
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });

    it('rejects getRoster when the caller does not teach the section', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRoster('section-9', '2026-08-01', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('does not leak a cached roster to an unassigned teacher', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);
      const redisGet = jest
        .fn()
        .mockResolvedValue([
          { studentId: 'someone-else', name: 'Someone Else' },
        ]);
      (service as unknown as { redis: RedisService }).redis.get = redisGet;

      await expect(
        service.getRoster('section-9', '2026-08-01', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      // Authorization must run before the cache is consulted.
      expect(redisGet).not.toHaveBeenCalled();
    });

    it('rejects markAttendance when the caller does not teach the section', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.markAttendance(
          {
            sectionId: 'section-9',
            date: '2026-08-01',
            entries: [{ studentId: 's1', status: 'Present' }],
          } as never,
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects getAttendanceStatus when the caller does not teach the section', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getAttendanceStatus('section-9', '2026-08-01', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('throws Unauthorized when the auth record does not exist', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getRoster('section-1', '2026-08-01', 'ghost'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('allows a class teacher of the section', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue({
        id: 'section-1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue(
        WORKING_DAY,
      );
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', details: { name: 'Asha', profilePic: null } },
      ]);
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([
        {
          studentId: 's1',
          status: 'NotMarked',
          markedAt: null,
          date: new Date(),
          markedById: null,
          sectionId: 'section-1',
          student: { id: 's1', details: { name: 'Asha', profilePic: null } },
        },
      ]);

      const result = await service.getRoster(
        'section-1',
        '2026-08-01',
        'auth-1',
      );

      expect(result.source).toBe('db');
      expect(result.data).toHaveLength(1);
    });

    it('allows a subject teacher assigned to the section', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue({
        id: 'section-1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue(
        WORKING_DAY,
      );
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', details: { name: 'Asha', profilePic: null } },
      ]);
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.getRoster('section-1', '2026-08-01', 'auth-1'),
      ).resolves.toBeDefined();
    });

    it('lets an Admin through without a section lookup', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'admin-1',
        user: { role: 'Admin' },
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue(
        WORKING_DAY,
      );
      (prisma.user.findMany as jest.Mock).mockResolvedValue([
        { id: 's1', details: { name: 'Asha', profilePic: null } },
      ]);
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([]);

      await service.getRoster('section-1', '2026-08-01', 'auth-1');

      expect(prisma.section.findFirst).not.toHaveBeenCalled();
    });

    it('still rejects marking on a non-working day after authorization passes', async () => {
      asTeacher();
      (prisma.section.findFirst as jest.Mock).mockResolvedValue({
        id: 'section-1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        date: new Date(),
        type: 'Holiday',
        label: 'Independence Day',
      });

      await expect(
        service.getRoster('section-1', '2026-08-01', 'auth-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
