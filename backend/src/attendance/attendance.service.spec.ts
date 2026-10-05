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
import { zonedToday } from '@/common/utils/date.util';
import type { MarkAttendanceDto } from './dto/mark-attendance.dto';

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

    it.each([
      ['undefined', undefined],
      ['null', null],
      ['empty string', ''],
      ['whitespace', '   '],
    ])(
      'refuses a %s sectionId instead of querying without a section filter',
      async (_label, sectionId) => {
        asTeacher();

        // Prisma drops `undefined` from a `where` clause, so before this guard
        // `findFirst({ where: { id: undefined, OR: [...] } })` matched any
        // section the teacher taught, passed, and the subsequent user query ran
        // unfiltered — returning every student in the school.
        await expect(
          service.getRoster(
            sectionId as unknown as string,
            '2026-08-01',
            'auth-1',
          ),
        ).rejects.toBeInstanceOf(BadRequestException);

        expect(prisma.section.findFirst).not.toHaveBeenCalled();
        expect(prisma.user.findMany).not.toHaveBeenCalled();
      },
    );

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
  /**
   * The invariant that motivated extracting attendanceEditWindow: the read and
   * write paths must agree about whether a date is editable, in every case.
   */
  describe('getAttendanceStatus / markAttendance lock agreement', () => {
    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const today = zonedToday();
    const shift = (days: number) =>
      iso(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const primeRead = (date: string, rows: unknown[]) => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      (prisma.section.findFirst as jest.Mock).mockResolvedValue({
        id: 'section-1',
      });
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        date: new Date(date),
        type: 'Working',
      });
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue(rows);
    };

    it.each([
      ['today', 0],
      ['yesterday', -1],
      ['two days ago', -2],
      ['a week ago', -7],
      ['tomorrow', 1],
    ])(
      'reports the same verdict for %s from both endpoints',
      async (_label, offset) => {
        const date = shift(offset);

        // Read path: yesterday marked a long time ago, so a markedAt-based lock
        // would disagree with the calendar-day rule.
        primeRead(date, [{ status: 'Present', markedAt: new Date(0) }]);
        const status = await service.getAttendanceStatus(
          'section-1',
          date,
          'auth-1',
        );

        // Write path.
        (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 's1' }]);

        let writeAllowed = true;
        try {
          await service.markAttendance(
            {
              sectionId: 'section-1',
              date,
              entries: [{ studentId: 's1', status: 'Present' }],
            } as never,
            'auth-1',
          );
        } catch {
          writeAllowed = false;
        }

        expect(status.isLocked).toBe(!writeAllowed);
      },
    );
  });

  describe('markAttendance sentinel guard', () => {
    it('refuses a batch containing NotMarked before any write happens', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });

      const dto = {
        sectionId: 'section-1',
        date: '2026-10-04',
        entries: [
          { studentId: 's1', status: 'Present' },
          // Bypasses the DTO to prove the service guards the write itself.
          { studentId: 's2', status: 'NotMarked' },
        ],
      } as unknown as MarkAttendanceDto;

      await expect(
        service.markAttendance(dto, 'auth-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      // Nothing may be written: the upsert would have stamped markedById and
      // markedAt onto a row that reads as unmarked.
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });
  });

  describe('markAttendance date window', () => {
    const asClassTeacher = () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      (prisma.section.findFirst as jest.Mock).mockResolvedValue({
        id: 'section-1',
      });
    };

    const singleStudent = () => {
      (prisma.user.findMany as jest.Mock).mockResolvedValue([{ id: 's1' }]);
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([]);
    };

    const iso = (d: Date) => d.toISOString().slice(0, 10);
    const today = zonedToday();
    const shift = (days: number) =>
      iso(new Date(today.getTime() + days * 24 * 60 * 60 * 1000));

    const entry = [{ studentId: 's1', status: 'Present' as const }];

    it('rejects a future date', async () => {
      asClassTeacher();
      singleStudent();

      // The calendar contains every day of the year, so a future *working* day
      // previously passed the Working check and could be marked.
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });

      await expect(
        service.markAttendance(
          { sectionId: 'section-1', date: shift(1), entries: entry },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });

    it('rejects a date older than the grace window even when never marked', async () => {
      asClassTeacher();
      singleStudent();
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });

      // Regression: the lock keyed on markedAt, so a past date that had never
      // been marked had no lock at all and stayed editable indefinitely.
      await expect(
        service.markAttendance(
          { sectionId: 'section-1', date: shift(-10), entries: entry },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.attendance.upsert).not.toHaveBeenCalled();
    });

    it('still allows editing yesterday', async () => {
      asClassTeacher();
      singleStudent();
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });

      await service.markAttendance(
        { sectionId: 'section-1', date: shift(-1), entries: entry },
        'auth-1',
      );

      expect(prisma.attendance.upsert).toHaveBeenCalled();
    });

    it('reassigns sectionId when a transferred student is re-marked', async () => {
      asClassTeacher();
      singleStudent();
      (prisma.academicCalendarDay.findUnique as jest.Mock).mockResolvedValue({
        type: 'Working',
      });
      // Row already exists from the student's previous section.
      (prisma.attendance.findMany as jest.Mock).mockResolvedValue([
        { studentId: 's1', markedAt: new Date('2026-01-01T00:00:00.000Z') },
      ]);

      await service.markAttendance(
        { sectionId: 'section-1', date: shift(0), entries: entry },
        'auth-1',
      );

      // Prisma's overloaded `upsert` signature makes `mock.calls` untyped, so
      // re-type it narrowly rather than indexing an `any`.
      const upsertMock = prisma.attendance.upsert as unknown as jest.Mock<
        unknown,
        [{ update: Record<string, unknown> }]
      >;
      const arg = upsertMock.mock.calls[0][0];

      // The unique key is [studentId, date] and never mentions the section, so
      // without reassignment the row kept pointing at the old section.
      expect(arg.update.sectionId).toBe('section-1');
    });
  });
});
