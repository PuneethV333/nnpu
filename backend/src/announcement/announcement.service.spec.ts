import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, UnauthorizedException } from '@nestjs/common';
import { AnnouncementService } from './announcement.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { LoggerService } from '@/logger/logger.service';
import type { AnnouncementDto } from './dto/announcement-Query.dto';

type FindManyArg = {
  where?: Record<string, unknown>;
  take?: number;
  skip?: number;
};
type FindFirstArg = { where?: Record<string, unknown> };

describe('AnnouncementService', () => {
  let service: AnnouncementService;
  let prisma: {
    auth: { findUnique: jest.Mock<Promise<unknown>, [unknown]> };
    sectionSubject: {
      findMany: jest.Mock<Promise<unknown>, [unknown]>;
    };
    announcement: {
      findMany: jest.Mock<Promise<unknown>, [FindManyArg]>;
      findFirst: jest.Mock<Promise<unknown>, [FindFirstArg]>;
    };
  };
  let redis: {
    get: jest.Mock<Promise<unknown>, [string]>;
    set: jest.Mock<Promise<unknown>, [string, unknown]>;
  };

  const PAGE: AnnouncementDto = { page: 1, pageSize: 10 };

  const rows = () =>
    [
      {
        id: 'a1',
        title: 't',
        body: 'b',
        type: 'Normal',
        author: { details: { name: 'A', profilePic: 'p' } },
      },
    ] as never;

  const asStudent = (over: Record<string, unknown> = {}) => {
    prisma.auth.findUnique.mockResolvedValue({
      userId: 'student-1',
      user: {
        role: 'Student',
        schoolId: 'school-1',
        sectionId: 'section-1',
        ...over,
      },
    });
  };

  const asTeacher = (sectionIds: string[] = ['section-1']) => {
    prisma.auth.findUnique.mockResolvedValue({
      userId: 'teacher-1',
      user: { role: 'Teacher', schoolId: 'school-1', sectionId: null },
    });
    prisma.sectionSubject.findMany.mockResolvedValue(
      sectionIds.map((sectionId) => ({ sectionId })),
    );
  };

  const asAdmin = () => {
    prisma.auth.findUnique.mockResolvedValue({
      userId: 'admin-1',
      user: { role: 'Admin', schoolId: 'school-1', sectionId: null },
    });
  };

  const lastWhere = (): Record<string, unknown> => {
    const calls = prisma.announcement.findMany.mock.calls;
    const last = calls[calls.length - 1];
    return last === undefined ? {} : (last[0].where ?? {});
  };

  beforeEach(async () => {
    prisma = {
      auth: {
        findUnique: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockImplementation(() => Promise.resolve(null)),
      },
      sectionSubject: {
        findMany: jest
          .fn<Promise<unknown>, [unknown]>()
          .mockImplementation(() => Promise.resolve([])),
      },
      announcement: {
        findMany: jest
          .fn<Promise<unknown>, [FindManyArg]>()
          .mockImplementation(() => Promise.resolve(rows())),
        findFirst: jest
          .fn<Promise<unknown>, [FindFirstArg]>()
          .mockImplementation(() => Promise.resolve(rows()[0])),
      },
    };
    redis = {
      get: jest
        .fn<Promise<unknown>, [string]>()
        .mockImplementation(() => Promise.resolve(null)),
      set: jest
        .fn<Promise<unknown>, [string, unknown]>()
        .mockImplementation(() => Promise.resolve()),
    };

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

  it('rejects an unknown auth record', async () => {
    await expect(service.findAll(PAGE, 'ghost')).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });

  describe('audience scoping', () => {
    it('restricts a student to their own section', async () => {
      asStudent();
      await service.findAll(PAGE, 'student-auth');

      const where = JSON.stringify(lastWhere());

      expect(where).toContain('section-1');
      expect(where).toContain('sectionId');
    });

    it('restricts a teacher to the sections they teach', async () => {
      asTeacher(['section-3', 'section-4']);
      await service.findAll(PAGE, 'teacher-auth');

      expect(prisma.sectionSubject.findMany).toHaveBeenCalled();
      const where = JSON.stringify(lastWhere());
      expect(where).toContain('section-3');
      expect(where).toContain('section-4');
    });

    it('gives an Admin no section restriction', async () => {
      asAdmin();
      await service.findAll(PAGE, 'admin-auth');

      const where = lastWhere();
      expect(JSON.stringify(where)).not.toContain('sectionId');
    });

    it('scopes to the caller school and still allows global posts', async () => {
      asStudent();
      await service.findAll(PAGE, 'student-auth');

      const where = JSON.stringify(lastWhere());
      expect(where).toContain('school-1');
      expect(where).toContain('schoolId');
    });

    it('shows only global posts to a user with no school', async () => {
      asStudent({ schoolId: null, sectionId: null });
      await service.findAll(PAGE, 'student-auth');

      const where = lastWhere();
      expect(JSON.stringify(where)).toContain('schoolId');
      expect(JSON.stringify(where)).not.toContain('school-1');
    });

    it('always includes school-wide posts', async () => {
      asStudent();
      await service.findAll(PAGE, 'student-auth');

      // sectionId: null / schoolId: null are how a broadcast post is expressed,
      // and those must stay visible or the filter hides ordinary notices.
      expect(JSON.stringify(lastWhere())).toContain('null');
    });
  });

  describe('cache isolation', () => {
    it('keys the cache per audience, not globally', async () => {
      asStudent();
      await service.findAll(PAGE, 'student-auth');
      await service.findLatest('student-auth');

      const keys = redis.set.mock.calls.map((c) => c[0]);

      // Regression: keys were `announcement:{page}:{size}` for everyone, so the
      // first caller's filtered page was served to every other user.
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) {
        expect(key).not.toBe('announcements:latest');
      }
    });

    it('gives two students in different sections different cache keys', async () => {
      asStudent();
      await service.findAll(PAGE, 'auth-student-1');
      const first = redis.set.mock.calls[0]?.[0];

      asStudent({ sectionId: 'section-2' });
      redis.set.mockClear();
      await service.findAll(PAGE, 'auth-student-2');
      const second = redis.set.mock.calls[0]?.[0];

      expect(first).not.toBe(second);
    });

    it('does not let one audience read another audience cached entry', async () => {
      asStudent();
      await service.findAll(PAGE, 'auth-student-1');
      const first = redis.set.mock.calls[0]?.[0];

      // Simulate the shared-key bug: the same key coming back from Redis.
      redis.get.mockImplementation((key: string) =>
        Promise.resolve(key === first ? [{ id: 'leaked' }] : null),
      );

      asStudent({ sectionId: 'section-9' });
      const result = await service.findAll(PAGE, 'auth-student-9');

      expect(result.source).toBe('db');
    });
  });

  describe('details', () => {
    it('scopes the lookup so an out-of-audience id is not found', async () => {
      asStudent();
      prisma.announcement.findFirst.mockImplementation(() =>
        Promise.resolve(null),
      );

      await expect(
        service.details('someone-elses', 'student-auth'),
      ).rejects.toBeInstanceOf(NotFoundException);

      const call = prisma.announcement.findFirst.mock.calls[0];
      expect(JSON.stringify(call?.[0].where)).toContain('someone-elses');
    });
  });
});
