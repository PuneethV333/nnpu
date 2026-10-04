/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { MarksService } from './marks.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

const ASSESSMENT = {
  id: 'assessment-1',
  sectionId: 'section-1',
  subjectId: 'subject-1',
  name: 'Unit Test 1',
  category: 'UnitTest',
  maxMarks: 25,
};

describe('MarksService', () => {
  let service: MarksService;
  let prisma: jest.Mocked<PrismaService>;

  const buildModule = async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarksService,
        {
          provide: PrismaService,
          useValue: {
            auth: { findUnique: jest.fn() },
            user: { findMany: jest.fn() },
            assessment: { findUnique: jest.fn(), create: jest.fn() },
            sectionSubject: { findUnique: jest.fn() },
            subject: { findUnique: jest.fn() },
            mark: { findMany: jest.fn(), upsert: jest.fn() },
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
      ],
    }).compile();

    service = module.get(MarksService);
    prisma = module.get(PrismaService);
  };

  beforeEach(async () => {
    await buildModule();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  const asAdmin = () =>
    (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
      userId: 'admin-1',
      user: { role: 'Admin' },
    });

  const withAssessment = () =>
    (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(ASSESSMENT);

  const sectionStudents = (ids: string[]) =>
    (prisma.user.findMany as jest.Mock).mockResolvedValue(
      ids.map((id) => ({ id })),
    );

  describe('enterMarks authorization', () => {
    it('throws Unauthorized when the auth record does not exist', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assessment-1',
            entries: [{ studentId: 's1', marksObtained: 10 }],
          },
          'ghost',
        ),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a teacher who is not the assigned teacher for the subject', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      withAssessment();
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assessment-1',
            entries: [{ studentId: 's1', marksObtained: 10 }],
          },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.mark.upsert).not.toHaveBeenCalled();
    });

    it('rejects marks above the assessment max', async () => {
      asAdmin();
      withAssessment();
      sectionStudents(['s1']);

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assessment-1',
            entries: [{ studentId: 's1', marksObtained: 26 }],
          },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects a student who does not belong to the assessment section', async () => {
      asAdmin();
      withAssessment();
      // 'outsider' is in a different section, so it isn't in this set.
      sectionStudents(['s1', 's2']);

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assessment-1',
            entries: [
              { studentId: 's1', marksObtained: 10 },
              { studentId: 'outsider', marksObtained: 12 },
            ],
          },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      // The cross-section write must never reach the upsert.
      expect(prisma.mark.upsert).not.toHaveBeenCalled();
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('rejects the same student appearing twice', async () => {
      asAdmin();
      withAssessment();
      sectionStudents(['s1']);

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assessment-1',
            entries: [
              { studentId: 's1', marksObtained: 10 },
              { studentId: 's1', marksObtained: 20 },
            ],
          },
          'auth-1',
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      // A duplicate would otherwise be silently overwritten by the later entry.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows a partial submission of the section students', async () => {
      asAdmin();
      withAssessment();
      sectionStudents(['s1', 's2', 's3']);

      await service.enterMarks(
        {
          assessmentId: 'assessment-1',
          entries: [{ studentId: 's1', marksObtained: 10 }],
        },
        'auth-1',
      );

      // Unlike attendance, marks need not cover the whole section.
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });
});
