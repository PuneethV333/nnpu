import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { TimetableService } from './time-table.service';
import { PrismaService } from '@/prisma/prisma.service';

/**
 * Regression coverage for the teacher home page bug: `getTimetable` assumed a
 * student (`User.sectionId` + `User.combinationId`) and threw NotFoundException
 * for every teacher, so the app rendered "No classes scheduled for today."
 * Keyed off `TimetableSlot.teacherId` / `SectionSubjectTeacher.teacherId`
 * instead.
 */
describe('TimetableService', () => {
  let service: TimetableService;
  let prisma: {
    auth: { findUnique: jest.Mock };
    section: { findUnique: jest.Mock };
    combination: { findUnique: jest.Mock };
    period: { findMany: jest.Mock };
    timetableSlot: { findMany: jest.Mock };
    sectionSubject: { findMany: jest.Mock };
    sectionSubjectTeacher: { findMany: jest.Mock };
  };

  const time = (hhmm: string) => new Date(`1970-01-01T${hhmm}:00.000Z`);

  beforeEach(async () => {
    prisma = {
      auth: { findUnique: jest.fn() },
      section: { findUnique: jest.fn() },
      combination: { findUnique: jest.fn() },
      period: { findMany: jest.fn().mockResolvedValue([]) },
      timetableSlot: { findMany: jest.fn().mockResolvedValue([]) },
      sectionSubject: { findMany: jest.fn().mockResolvedValue([]) },
      sectionSubjectTeacher: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimetableService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get(TimetableService);
  });

  afterEach(() => jest.clearAllMocks());

  const asUser = (user: Record<string, unknown>) =>
    prisma.auth.findUnique.mockResolvedValue({ user });

  const period = {
    id: 'p1',
    order: 1,
    startTime: time('08:00'),
    endTime: time('08:45'),
    isBreak: false,
    label: null,
  };

  const slot = (overrides: Record<string, unknown> = {}) => ({
    day: 'MONDAY',
    periodId: 'p1',
    sectionId: 'sec-1',
    subjectId: 'sub-1',
    teacherId: 't1',
    language: null,
    combination: null,
    subject: { id: 'sub-1', name: 'Physics' },
    section: { name: '1-SCI-A' },
    ...overrides,
  });

  it('throws 401 when the authId does not resolve', async () => {
    prisma.auth.findUnique.mockResolvedValue(null);

    await expect(service.getTimetable('missing')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  it('does not throw for a teacher and uses the slot they are assigned to', async () => {
    asUser({ id: 't1', role: 'Teacher', sectionId: null, combinationId: null });
    prisma.period.findMany.mockResolvedValue([period]);
    prisma.timetableSlot.findMany.mockResolvedValue([slot()]);

    const week = await service.getTimetable('auth-1');

    expect(week).toHaveLength(6);
    const monday = week.find((d) => d.day === 'MONDAY');
    expect(monday?.slots).toHaveLength(1);
    expect(monday?.slots[0].options[0]).toEqual({
      subject: 'Physics',
      teacher: null,
      language: null,
      combination: null,
      section: '1-SCI-A',
    });
    // The teacher's home page keys off "is anything scheduled today"; a day
    // with no teaching must not be padded with empty periods.
    expect(week.find((d) => d.day === 'TUESDAY')?.slots).toHaveLength(0);
  });

  it('credits a slot with no teacherId to the section-subject staffer', async () => {
    asUser({ id: 't1', role: 'Teacher', sectionId: null, combinationId: null });
    prisma.period.findMany.mockResolvedValue([period]);
    prisma.sectionSubjectTeacher.findMany.mockResolvedValue([
      { sectionSubject: { sectionId: 'sec-1', subjectId: 'sub-1' } },
    ]);
    prisma.timetableSlot.findMany.mockResolvedValue([
      slot({ teacherId: null }),
      // Same section, different subject: must not be swept in by the
      // section-only pre-filter.
      slot({ teacherId: null, subjectId: 'sub-2' }),
    ]);

    const monday = (await service.getTimetable('auth-1')).find(
      (d) => d.day === 'MONDAY',
    );

    expect(monday?.slots).toHaveLength(1);
    expect(monday?.slots[0].options).toHaveLength(1);
    expect(monday?.slots[0].options[0].subject).toBe('Physics');
  });

  it('still serves the student path when section and combination are set', async () => {
    asUser({
      id: 's1',
      role: 'Student',
      sectionId: 'sec-1',
      combinationId: 'comb-1',
    });
    prisma.section.findUnique.mockResolvedValue({ id: 'sec-1' });
    prisma.combination.findUnique.mockResolvedValue({ stream: 'Science' });
    prisma.period.findMany.mockResolvedValue([period]);

    const week = await service.getTimetable('auth-1');

    expect(week).toHaveLength(6);
    expect(week[0].slots[0].options).toEqual([]);
    // Student options never carry a section: it is implied.
    expect(prisma.timetableSlot.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { sectionId: 'sec-1' } }),
    );
  });
});
