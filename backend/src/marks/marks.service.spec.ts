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

describe('MarksService', () => {
  let service: MarksService;
  let prisma: jest.Mocked<PrismaService>;

  const mockAuth = (userId: string, role: string) =>
    (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
      userId,
      user: { role },
    });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarksService,
        {
          provide: PrismaService,
          useValue: {
            auth: { findUnique: jest.fn() },
            subject: { findUnique: jest.fn() },
            sectionSubject: { findUnique: jest.fn() },
            assessment: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              create: jest.fn(),
            },
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
  });

  afterEach(() => jest.clearAllMocks());

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createAssessment', () => {
    const baseDto = {
      name: 'Unit Test 1',
      category: 'UnitTest' as const,
      subjectId: 'subj1',
      sectionId: 'sec1',
      maxMarks: 20,
    };

    it('throws UnauthorizedException if auth not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createAssessment(baseDto, 'missing'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws ForbiddenException if the teacher is not assigned to this section+subject', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
        user: { role: 'Teacher' },
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createAssessment(baseDto, 'auth1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException if subject not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
        user: { role: 'Teacher' },
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'teacher1',
      });
      (prisma.subject.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.createAssessment(baseDto, 'auth1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws BadRequestException if creating FinalPractical for a subject with no practical', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
        user: { role: 'Teacher' },
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'teacher1',
      });
      (prisma.subject.findUnique as jest.Mock).mockResolvedValue({
        id: 'subj1',
        name: 'Mathematics',
        hasPractical: false,
      });

      await expect(
        service.createAssessment(
          { ...baseDto, category: 'FinalPractical' },
          'auth1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates the assessment when subject supports the category and teacher is assigned', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue({
        userId: 'teacher1',
        user: { role: 'Teacher' },
      });
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'teacher1',
      });
      (prisma.subject.findUnique as jest.Mock).mockResolvedValue({
        id: 'subj1',
        name: 'Physics',
        hasPractical: true,
      });
      const created = { id: 'assess1', ...baseDto, category: 'FinalPractical' };
      (prisma.assessment.create as jest.Mock).mockResolvedValue(created);

      const result = await service.createAssessment(
        { ...baseDto, category: 'FinalPractical', maxMarks: 30 },
        'auth1',
      );

      expect(result).toEqual(created);
    });
  });

  describe('listAssessments', () => {
    it('lists assessments for a section without a subject filter', async () => {
      const mockAssessments = [{ id: 'a1' }];
      (prisma.assessment.findMany as jest.Mock).mockResolvedValue(
        mockAssessments,
      );

      const result = await service.listAssessments('sec1');

      expect(result).toEqual(mockAssessments);
      expect(prisma.assessment.findMany).toHaveBeenCalledWith({
        where: { sectionId: 'sec1' },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('filters by subjectId when provided', async () => {
      (prisma.assessment.findMany as jest.Mock).mockResolvedValue([]);

      await service.listAssessments('sec1', 'subj1');

      expect(prisma.assessment.findMany).toHaveBeenCalledWith({
        where: { sectionId: 'sec1', subjectId: 'subj1' },
        orderBy: { createdAt: 'asc' },
      });
    });
  });

  describe('enterMarks', () => {
    const baseDto = {
      assessmentId: 'assess1',
      entries: [{ studentId: 'st1', marksObtained: 18 }],
    };
    const baseAssessment = {
      id: 'assess1',
      maxMarks: 20,
      sectionId: 'sec1',
      subjectId: 'subj1',
    };

    it('throws UnauthorizedException if auth not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.enterMarks(baseDto, 'missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws BadRequestException if assessment not found', async () => {
      mockAuth('teacher1', 'Teacher');
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.enterMarks(baseDto, 'auth1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws ForbiddenException if the teacher is not assigned to this subject', async () => {
      mockAuth('teacher1', 'Teacher');
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(
        baseAssessment,
      );
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'someoneElse',
      });

      await expect(service.enterMarks(baseDto, 'auth1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException if any entry exceeds maxMarks', async () => {
      mockAuth('teacher1', 'Teacher');
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(
        baseAssessment,
      );
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'teacher1',
      });

      await expect(
        service.enterMarks(
          {
            assessmentId: 'assess1',
            entries: [{ studentId: 'st1', marksObtained: 25 }],
          },
          'auth1',
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('upserts marks when the caller is the assigned teacher', async () => {
      mockAuth('teacher1', 'Teacher');
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(
        baseAssessment,
      );
      (prisma.sectionSubject.findUnique as jest.Mock).mockResolvedValue({
        teacherId: 'teacher1',
      });
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);

      const result = await service.enterMarks(baseDto, 'auth1');

      expect(result).toEqual({ message: 'Marks entered for 1 students' });
      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    });

    it('allows Admin to enter marks without an assignment check', async () => {
      mockAuth('admin1', 'Admin');
      (prisma.assessment.findUnique as jest.Mock).mockResolvedValue(
        baseAssessment,
      );
      (prisma.$transaction as jest.Mock).mockResolvedValue([]);

      const result = await service.enterMarks(baseDto, 'auth1');

      expect(result).toEqual({ message: 'Marks entered for 1 students' });
      expect(prisma.sectionSubject.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('getMyMarks', () => {
    it('throws UnauthorizedException if auth not found', async () => {
      (prisma.auth.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(service.getMyMarks('missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('returns marks for the resolved student, without subject filter', async () => {
      mockAuth('student1', 'Student');
      const mockMarks = [{ id: 'm1' }];
      (prisma.mark.findMany as jest.Mock).mockResolvedValue(mockMarks);

      const result = await service.getMyMarks('auth1');

      expect(result).toEqual(mockMarks);
      expect(prisma.mark.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student1' },
        include: { assessment: { include: { subject: true } } },
        orderBy: { assessment: { createdAt: 'desc' } },
      });
    });

    it('filters by subjectId when provided', async () => {
      mockAuth('student1', 'Student');
      (prisma.mark.findMany as jest.Mock).mockResolvedValue([]);

      await service.getMyMarks('auth1', 'subj1');

      expect(prisma.mark.findMany).toHaveBeenCalledWith({
        where: { studentId: 'student1', assessment: { subjectId: 'subj1' } },
        include: { assessment: { include: { subject: true } } },
        orderBy: { assessment: { createdAt: 'desc' } },
      });
    });
  });

  describe('getFinalReport', () => {
    const mockMarks = [
      {
        marksObtained: 60,
        assessment: { maxMarks: 70, category: 'FinalTheory' },
      },
      {
        marksObtained: 28,
        assessment: { maxMarks: 30, category: 'FinalPractical' },
      },
      {
        marksObtained: 18,
        assessment: { maxMarks: 20, category: 'Internal' },
      },
    ];

    it("throws ForbiddenException if a student requests another student's report", async () => {
      mockAuth('student1', 'Student');

      await expect(
        service.getFinalReport('someoneElse', 'subj1', 'auth1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows a student to view their own report', async () => {
      mockAuth('student1', 'Student');
      (prisma.mark.findMany as jest.Mock).mockResolvedValue(mockMarks);

      const result = await service.getFinalReport('student1', 'subj1', 'auth1');

      expect(result.total).toBe(106);
    });

    it("allows any Teacher to view any student's report", async () => {
      mockAuth('teacher1', 'Teacher');
      (prisma.mark.findMany as jest.Mock).mockResolvedValue(mockMarks);

      const result = await service.getFinalReport('student1', 'subj1', 'auth1');

      expect(result.total).toBe(106);
    });

    it('computes total, maxTotal, and percentage from Final+Internal marks only', async () => {
      mockAuth('admin1', 'Admin');
      (prisma.mark.findMany as jest.Mock).mockResolvedValue(mockMarks);

      const result = await service.getFinalReport('student1', 'subj1', 'auth1');

      expect(result.total).toBe(106);
      expect(result.maxTotal).toBe(120);
      expect(result.percentage).toBeCloseTo(88.33, 2);
      expect(prisma.mark.findMany).toHaveBeenCalledWith({
        where: {
          studentId: 'student1',
          assessment: {
            subjectId: 'subj1',
            category: { in: ['FinalTheory', 'FinalPractical', 'Internal'] },
          },
        },
        include: { assessment: true },
      });
    });

    it('returns 0 percentage when there are no matching marks', async () => {
      mockAuth('admin1', 'Admin');
      (prisma.mark.findMany as jest.Mock).mockResolvedValue([]);

      const result = await service.getFinalReport('student1', 'subj1', 'auth1');

      expect(result.total).toBe(0);
      expect(result.maxTotal).toBe(0);
      expect(result.percentage).toBe(0);
    });
  });
});
