import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@/generated/prisma';
import { SectionsService } from './sections.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';
import type { AssignSubjectsDto, SetClassTeacherDto } from './dto';

describe('SectionsService assignments', () => {
  let service: SectionsService;
  let prisma: {
    section: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    subject: { findMany: jest.Mock };
    user: { findMany: jest.Mock };
    sectionSubject: { findMany: jest.Mock; upsert: jest.Mock };
    $transaction: jest.Mock;
  };
  let redis: { delPattern: jest.Mock };

  beforeEach(async () => {
    prisma = {
      section: { findUnique: jest.fn(), update: jest.fn() },
      subject: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      sectionSubject: { findMany: jest.fn(), upsert: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((ops: unknown) =>
          Promise.all(ops as Promise<unknown>[]),
        ),
    };
    redis = { delPattern: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SectionsService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
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

    service = module.get(SectionsService);
  });

  const teacher = (id: string, role = 'Teacher', isActive = true) => ({
    id,
    role,
    isActive,
  });

  describe('setClassTeacher', () => {
    it('assigns a teacher and invalidates both my-sections caches', async () => {
      prisma.section.findUnique
        // section-exists probe, then the previous-holder probe
        .mockResolvedValueOnce({ id: 'section-1' })
        .mockResolvedValueOnce({ classTeacherId: 'teacher-old' });
      prisma.user.findMany.mockResolvedValue([teacher('teacher-1')]);
      prisma.section.update.mockResolvedValue({
        id: 'section-1',
        classTeacherId: 'teacher-1',
      });

      const dto = { teacherId: 'teacher-1' } as SetClassTeacherDto;
      await expect(service.setClassTeacher('section-1', dto)).resolves.toEqual({
        id: 'section-1',
        classTeacherId: 'teacher-1',
      });

      expect(prisma.section.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'section-1' },
          data: { classTeacherId: 'teacher-1' },
        }),
      );

      // getMySections caches per user for 300s. Without this the new teacher
      // cannot see their section and the old one still can.
      expect(redis.delPattern).toHaveBeenCalledWith('sections:teacher:*');
    });

    it('404s for an unknown section', async () => {
      prisma.section.findUnique.mockResolvedValue(null);

      await expect(
        service.setClassTeacher('nope', { teacherId: null }),
      ).rejects.toBeInstanceOf(NotFoundException);

      expect(prisma.section.update).not.toHaveBeenCalled();
    });

    it('rejects a non-Teacher id', async () => {
      prisma.section.findUnique.mockResolvedValue({ id: 'section-1' });
      // A Student/Admin id would create an assignment no attendance path honours.
      prisma.user.findMany.mockResolvedValue([teacher('student-9', 'Student')]);

      await expect(
        service.setClassTeacher('section-1', {
          teacherId: 'student-9',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.section.update).not.toHaveBeenCalled();
    });

    it('rejects a deactivated teacher', async () => {
      prisma.section.findUnique.mockResolvedValue({ id: 'section-1' });
      prisma.user.findMany.mockResolvedValue([
        teacher('teacher-1', 'Teacher', false),
      ]);

      await expect(
        service.setClassTeacher('section-1', {
          teacherId: 'teacher-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('409s when the teacher already class-teachers another section', async () => {
      prisma.section.findUnique
        .mockResolvedValueOnce({ id: 'section-1' })
        .mockResolvedValueOnce({ classTeacherId: null });
      prisma.user.findMany.mockResolvedValue([teacher('teacher-1')]);
      prisma.section.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('unique', {
          code: 'P2002',
          clientVersion: '7.9.0',
        }),
      );

      // Section.classTeacherId is @unique: one teacher, one section.
      await expect(
        service.setClassTeacher('section-1', {
          teacherId: 'teacher-1',
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('allows clearing the class teacher with null', async () => {
      prisma.section.findUnique
        .mockResolvedValueOnce({ id: 'section-1' })
        .mockResolvedValueOnce({ classTeacherId: 'teacher-1' });
      prisma.section.update.mockResolvedValue({
        id: 'section-1',
        classTeacherId: null,
      });

      await expect(
        service.setClassTeacher('section-1', { teacherId: null }),
      ).resolves.toEqual({ id: 'section-1', classTeacherId: null });

      // No teacher validation needed for a clear.
      expect(prisma.user.findMany).not.toHaveBeenCalled();
    });
  });

  describe('assignSubjects', () => {
    const dto = {
      assignments: [
        { subjectId: 'sub-1', teacherId: 'teacher-1' },
        { subjectId: 'sub-2', teacherId: 'teacher-2' },
      ],
    } as AssignSubjectsDto;

    beforeEach(() => {
      prisma.section.findUnique.mockResolvedValue({ id: 'section-1' });
      prisma.subject.findMany.mockResolvedValue([
        { id: 'sub-1' },
        { id: 'sub-2' },
      ]);
      prisma.user.findMany.mockResolvedValue([
        teacher('teacher-1'),
        teacher('teacher-2'),
      ]);
      prisma.sectionSubject.findMany.mockResolvedValue([]);
      prisma.sectionSubject.upsert.mockResolvedValue({});
      prisma.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'A',
        session: 'SCI-A',
        classTeacher: null,
        subjects: [],
      });
    });

    it('upserts one row per subject', async () => {
      await service.assignSubjects('section-1', dto);

      expect(prisma.sectionSubject.upsert).toHaveBeenCalledTimes(2);
      expect(prisma.sectionSubject.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sectionId_subjectId: { sectionId: 'section-1', subjectId: 'sub-1' },
          },
          create: {
            sectionId: 'section-1',
            subjectId: 'sub-1',
            teacherId: 'teacher-1',
          },
        }),
      );
    });

    it('rejects a duplicate subject in the same request', async () => {
      // Two rows for one subject would race on the [sectionId, subjectId] unique.
      await expect(
        service.assignSubjects('section-1', {
          assignments: [
            { subjectId: 'sub-1', teacherId: 'teacher-1' },
            { subjectId: 'sub-1', teacherId: 'teacher-2' },
          ],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.sectionSubject.upsert).not.toHaveBeenCalled();
    });

    it('rejects an unknown subject before writing', async () => {
      prisma.subject.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      await expect(
        service.assignSubjects('section-1', dto),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.sectionSubject.upsert).not.toHaveBeenCalled();
    });

    it('rejects a non-Teacher assignment', async () => {
      prisma.user.findMany.mockResolvedValue([teacher('admin-1', 'Admin')]);

      await expect(
        service.assignSubjects('section-1', {
          assignments: [{ subjectId: 'sub-1', teacherId: 'admin-1' }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('invalidates the previous holder when a subject is reassigned', async () => {
      prisma.sectionSubject.findMany.mockResolvedValue([
        { subjectId: 'sub-1', teacherId: 'teacher-old' },
      ]);

      await service.assignSubjects('section-1', dto);

      // teacher-old no longer holds sub-1 and must not keep seeing the section.
      expect(redis.delPattern).toHaveBeenCalledWith('sections:teacher:*');
    });

    it('allows unassigning a subject with teacherId null', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.assignSubjects('section-1', {
        assignments: [{ subjectId: 'sub-1', teacherId: null }],
      });

      expect(prisma.sectionSubject.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { teacherId: null },
        }),
      );
    });

    it('does not fail the write when cache invalidation throws', async () => {
      redis.delPattern.mockRejectedValue(new Error('redis down'));

      await expect(
        service.assignSubjects('section-1', dto),
      ).resolves.toBeDefined();
    });
  });
});
