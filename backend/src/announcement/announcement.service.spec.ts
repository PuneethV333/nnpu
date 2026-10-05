import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';
import {
  AnnouncementAudience,
  CreateAnnouncementDto,
} from './dto/create-announcement.dto';

describe('AnnouncementService writes', () => {
  let service: AnnouncementService;
  let prisma: {
    auth: { findUnique: jest.Mock };
    announcement: {
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    section: { findUnique: jest.Mock };
  };
  let redis: { delPattern: jest.Mock };

  const authFor = (over: Record<string, unknown> = {}) => ({
    userId: 'admin-1',
    user: { role: 'Admin', schoolId: 'school-1', sectionId: null },
    ...over,
  });

  /**
   * Prisma's `create`/`update` mocks are untyped, so asserting through
   * `expect.objectContaining(...)` yields an `any` and trips
   * no-unsafe-assignment / no-unsafe-member-access. Capture the call argument
   * and re-type it narrowly instead, matching the sections/attendance specs.
   */
  const createData = (): Record<string, unknown> => {
    const mock = prisma.announcement.create as unknown as jest.Mock<
      unknown,
      [{ data: Record<string, unknown> }]
    >;
    return mock.mock.calls[0][0].data;
  };

  const updateData = (): Record<string, unknown> => {
    const mock = prisma.announcement.update as unknown as jest.Mock<
      unknown,
      [{ data: Record<string, unknown> }]
    >;
    return mock.mock.calls[0][0].data;
  };

  const dto = (
    over: Partial<CreateAnnouncementDto> = {},
  ): CreateAnnouncementDto => ({
    title: 'Holiday',
    body: 'Closed on the 15th.',
    type: 'Holiday',
    audience: AnnouncementAudience.School,
    ...over,
  });

  beforeEach(async () => {
    prisma = {
      auth: { findUnique: jest.fn().mockResolvedValue(authFor()) },
      announcement: {
        findUnique: jest.fn(),
        create: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ann-1',
            ...data,
            // `toLatest` reads author.details, which Prisma fills via the
            // include, so the mock must stand in for the joined row.
            author: { details: { name: 'Admin One', profilePic: null } },
          }),
        ),
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            id: 'ann-1',
            ...data,
            // `toLatest` reads author.details, which Prisma fills via the
            // include, so the mock must stand in for the joined row.
            author: { details: { name: 'Admin One', profilePic: null } },
          }),
        ),
        delete: jest.fn().mockResolvedValue({ id: 'ann-1' }),
      },
      section: { findUnique: jest.fn() },
    };
    redis = { delPattern: jest.fn().mockResolvedValue(1) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnnouncementService,
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

    service = module.get(AnnouncementService);
  });

  describe('create', () => {
    it('writes a school-wide post scoped to the author school', async () => {
      await service.create('admin-1', dto());

      expect(createData()).toMatchObject({
        schoolId: 'school-1',
        sectionId: null,
        authorId: 'admin-1',
      });
    });

    it('writes a global post with both ids null', async () => {
      // The read filter treats schoolId:null as "visible to everyone".
      await service.create(
        'admin-1',
        dto({ audience: AnnouncementAudience.Global }),
      );

      expect(createData()).toMatchObject({ schoolId: null, sectionId: null });
    });

    it('rejects a Section audience with no sectionId', async () => {
      await expect(
        service.create(
          'admin-1',
          dto({ audience: AnnouncementAudience.Section }),
        ),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.announcement.create).not.toHaveBeenCalled();
    });

    it('404s for an unknown section', async () => {
      prisma.section.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'admin-1',
          dto({ audience: AnnouncementAudience.Section, sectionId: 'nope' }),
        ),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('invalidates both cached read families', async () => {
      await service.create('admin-1', dto());

      // Read keys are audience-tagged, so no single key can be dropped.
      expect(redis.delPattern).toHaveBeenCalledWith('announcements:*');
      expect(redis.delPattern).toHaveBeenCalledWith('announcement:*');
    });

    it('does not fail the write when cache invalidation throws', async () => {
      redis.delPattern.mockRejectedValue(new Error('redis down'));

      await expect(service.create('admin-1', dto())).resolves.toBeDefined();
    });

    it('401s for an unknown auth', async () => {
      prisma.auth.findUnique.mockResolvedValue(null);

      await expect(service.create('admin-1', dto())).rejects.toBeInstanceOf(
        UnauthorizedException,
      );
    });
  });

  describe('update / remove authorization', () => {
    it('lets the author manage their own post', async () => {
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: 'school-1',
      });

      await expect(
        service.update('admin-1', 'ann-1', {
          title: 'New',
        }),
      ).resolves.toBeDefined();
    });

    it('lets an admin of the same school manage it', async () => {
      prisma.auth.findUnique.mockResolvedValue(authFor({ userId: 'admin-2' }));
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: 'school-1',
      });

      await expect(
        service.update('admin-2', 'ann-1', {
          title: 'New',
        }),
      ).resolves.toBeDefined();
    });

    it('refuses an admin from another school', async () => {
      prisma.auth.findUnique.mockResolvedValue(
        authFor({
          userId: 'admin-9',
          user: { role: 'Admin', schoolId: 'school-2' },
        }),
      );
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: 'school-1',
      });

      // Otherwise one school's admin could rewrite another school's notices.
      await expect(
        service.update('admin-9', 'ann-1', {
          title: 'New',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(prisma.announcement.update).not.toHaveBeenCalled();
    });

    it('refuses a non-admin non-author', async () => {
      prisma.auth.findUnique.mockResolvedValue(
        authFor({
          userId: 'teacher-1',
          user: { role: 'Teacher', schoolId: 'school-1' },
        }),
      );
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: null,
      });

      await expect(
        service.update('teacher-1', 'ann-1', {
          title: 'New',
        }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('404s for an unknown announcement', async () => {
      prisma.announcement.findUnique.mockResolvedValue(null);

      await expect(service.remove('admin-1', 'ann-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );

      expect(prisma.announcement.delete).not.toHaveBeenCalled();
    });

    it('applies the same checks to remove', async () => {
      prisma.auth.findUnique.mockResolvedValue(
        authFor({
          userId: 'admin-9',
          user: { role: 'Admin', schoolId: 'school-2' },
        }),
      );
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: 'school-1',
      });

      await expect(service.remove('admin-9', 'ann-1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
      expect(prisma.announcement.delete).not.toHaveBeenCalled();
    });
  });

  describe('update targeting', () => {
    beforeEach(() => {
      prisma.announcement.findUnique.mockResolvedValue({
        authorId: 'admin-1',
        schoolId: 'school-1',
      });
    });

    it('does not re-scope when only the title changes', async () => {
      // An unrelated edit must not silently re-target the post.
      await service.update('admin-1', 'ann-1', {
        title: 'New',
      });

      expect(updateData()).not.toHaveProperty('schoolId');
      expect(updateData()).not.toHaveProperty('sectionId');
    });

    it('re-sopes when audience is explicitly changed', async () => {
      await service.update('admin-1', 'ann-1', {
        audience: AnnouncementAudience.Global,
      });

      expect(updateData()).toMatchObject({ schoolId: null, sectionId: null });
    });

    it('rejects a sectionId sent without an audience change', async () => {
      await expect(
        service.update('admin-1', 'ann-1', {
          sectionId: 'section-1',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });
  });
});
