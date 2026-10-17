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
    sectionSubjectTeacher: { deleteMany: jest.Mock; createMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let redis: { delPattern: jest.Mock; del: jest.Mock };

  beforeEach(async () => {
    prisma = {
      section: { findUnique: jest.fn(), update: jest.fn() },
      subject: { findMany: jest.fn() },
      user: { findMany: jest.fn() },
      sectionSubject: { findMany: jest.fn(), upsert: jest.fn() },
      sectionSubjectTeacher: { deleteMany: jest.fn(), createMany: jest.fn() },
      $transaction: jest.fn(),
    };
    // `assignSubjects` now uses the interactive form because it needs the
    // upserted row's id to address its teacher rows. Hand the callback the same
    // mock client as the "tx".
    prisma.$transaction.mockImplementation(
      (cb: (t: typeof prisma) => unknown) => cb(prisma),
    );
    redis = {
      delPattern: jest.fn().mockResolvedValue(1),
      del: jest.fn().mockResolvedValue(true),
    };

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

      // `sections:all` carries `isClassTeacher`, derived from the very field
      // this call writes, so it has to go too — otherwise the admin's section
      // list still says the save did not work for the TTL.
      expect(redis.delPattern).toHaveBeenCalledWith('sections:teacher:*');
      expect(redis.del).toHaveBeenCalledWith('sections:all');

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
    const dto: AssignSubjectsDto = {
      assignments: [
        { subjectId: 'sub-1', teacherIds: ['teacher-1'] },
        { subjectId: 'sub-2', teacherIds: ['teacher-2'] },
      ],
    };

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
      // The service reads `row.id` off the upsert to address its teacher rows.
      prisma.sectionSubject.upsert.mockResolvedValue({ id: 'ss-1' });
      prisma.sectionSubjectTeacher.createMany.mockResolvedValue({ count: 1 });
      prisma.sectionSubjectTeacher.deleteMany.mockResolvedValue({ count: 0 });
      prisma.section.findUnique.mockResolvedValue({
        id: 'section-1',
        name: 'A',
        session: 'SCI-A',
        classTeacher: null,
        subjects: [],
      });
    });

    it('keeps one row per subject and writes its teachers as a set', async () => {
      await service.assignSubjects('section-1', dto);

      expect(prisma.sectionSubject.upsert).toHaveBeenCalledTimes(2);
      // The row no longer carries a teacher; the set lives beside it.
      expect(prisma.sectionSubject.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            sectionId_subjectId: { sectionId: 'section-1', subjectId: 'sub-1' },
          },
          update: {},
          create: { sectionId: 'section-1', subjectId: 'sub-1' },
        }),
      );
      expect(prisma.sectionSubjectTeacher.createMany).toHaveBeenCalledWith({
        data: [{ sectionSubjectId: 'ss-1', teacherId: 'teacher-1' }],
      });
    });

    it('assigns more than one teacher to a subject', async () => {
      await service.assignSubjects('section-1', {
        assignments: [
          { subjectId: 'sub-1', teacherIds: ['teacher-1', 'teacher-2'] },
        ],
      });

      expect(prisma.sectionSubjectTeacher.createMany).toHaveBeenCalledWith({
        data: [
          { sectionSubjectId: 'ss-1', teacherId: 'teacher-1' },
          { sectionSubjectId: 'ss-1', teacherId: 'teacher-2' },
        ],
      });
    });

    it('dedupes a teacher listed twice for one subject', async () => {
      // [sectionSubjectId, teacherId] is unique, so a duplicate would abort the
      // transaction on P2002.
      await service.assignSubjects('section-1', {
        assignments: [
          { subjectId: 'sub-1', teacherIds: ['teacher-1', 'teacher-1'] },
        ],
      });

      expect(prisma.sectionSubjectTeacher.createMany).toHaveBeenCalledWith({
        data: [{ sectionSubjectId: 'ss-1', teacherId: 'teacher-1' }],
      });
    });

    it('rejects a duplicate subject in the same request', async () => {
      // Two rows for one subject would race on the [sectionId, subjectId] unique.
      await expect(
        service.assignSubjects('section-1', {
          assignments: [
            { subjectId: 'sub-1', teacherIds: ['teacher-1'] },
            { subjectId: 'sub-1', teacherIds: ['teacher-2'] },
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
          assignments: [{ subjectId: 'sub-1', teacherIds: ['admin-1'] }],
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('invalidates the previous holder when a subject is reassigned', async () => {
      prisma.sectionSubject.findMany.mockResolvedValue([
        { subjectId: 'sub-1', teachers: [{ teacherId: 'teacher-old' }] },
      ]);

      await service.assignSubjects('section-1', dto);

      // teacher-old no longer holds sub-1 and must not keep seeing the section.
      expect(redis.delPattern).toHaveBeenCalledWith('sections:teacher:*');
      expect(redis.del).toHaveBeenCalledWith('sections:all');
    });

    it('keeps the subject and clears its teachers when teacherIds is empty', async () => {
      prisma.user.findMany.mockResolvedValue([]);

      await service.assignSubjects('section-1', {
        assignments: [{ subjectId: 'sub-1', teacherIds: [] }],
      });

      expect(prisma.sectionSubject.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ update: {} }),
      );
      // Unstaffed means the row survives with no teacher rows.
      expect(prisma.sectionSubjectTeacher.deleteMany).toHaveBeenCalledWith({
        where: { sectionSubjectId: 'ss-1' },
      });
      expect(prisma.sectionSubjectTeacher.createMany).not.toHaveBeenCalled();
    });

    it('does not fail the write when cache invalidation throws', async () => {
      redis.delPattern.mockRejectedValue(new Error('redis down'));

      await expect(
        service.assignSubjects('section-1', dto),
      ).resolves.toBeDefined();
    });
  });
});
