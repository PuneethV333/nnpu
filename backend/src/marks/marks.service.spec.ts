/* eslint-disable @typescript-eslint/unbound-method */
import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
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
            user: { findMany: jest.fn(), findUnique: jest.fn() },
            assessment: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
            sectionSubject: { findUnique: jest.fn(), findFirst: jest.fn() },
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
  describe('listAssessments authorization', () => {
    const asTeacher = () =>
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });

    it('rejects a teacher with no assignment in that section', async () => {
      // Regression: sectionId/subjectId arrived unvalidated and authorization was
      // skipped entirely, so any logged-in user could list every assessment in
      // the school.
      asTeacher();
      (prisma.sectionSubject.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.listAssessments('section-1', undefined, 'teacher-auth'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.assessment.findMany).not.toHaveBeenCalled();
    });

    it('allows a teacher assigned to the section', async () => {
      asTeacher();
      (prisma.sectionSubject.findFirst as jest.Mock).mockResolvedValue({
        id: 'ss-1',
      });
      (prisma.assessment.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.listAssessments('section-1', undefined, 'teacher-auth'),
      ).resolves.toEqual([]);

      expect(prisma.assessment.findMany).toHaveBeenCalledWith({
        where: { sectionId: 'section-1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('uses the stricter subject check when subjectId is supplied', async () => {
      asTeacher();
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.assessment.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.listAssessments('section-1', 'subject-1', 'teacher-auth'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('lets an Admin list without any assignment lookup', async () => {
      asAdmin();
      (prisma.assessment.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.listAssessments('section-1', undefined, 'admin-auth'),
      ).resolves.toEqual([]);
    });
  });

  describe('getFinalReport authorization', () => {
    it('rejects a teacher who does not teach that student', async () => {
      // Regression: role === 'Teacher' alone granted access to ANY student's
      // report for ANY subject.
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        sectionId: 'section-9',
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getFinalReport('student-9', 'subject-1', 'teacher-auth'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.mark.findMany).not.toHaveBeenCalled();
    });

    it("allows a teacher assigned to the student's own section", async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        sectionId: 'section-1',
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        sectionId: 'section-1',
        subjectId: 'subject-1',
        teacherId: 'teacher-1',
      });
      (prisma.mark.findMany as jest.Mock).mockResolvedValue([]);

      await expect(
        service.getFinalReport('student-1', 'subject-1', 'teacher-auth'),
      ).resolves.toBeDefined();
    });

    it('throws NotFound for an unknown student', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.getFinalReport('ghost', 'subject-1', 'teacher-auth'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });
});
