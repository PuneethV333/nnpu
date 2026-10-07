import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import type { PassOutStudentsDto } from './dto';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { MailService } from '@/mail/mail.service';
import { LoggerService } from '@/logger/logger.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: {
      findUnique: jest.Mock;
      findMany: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    auth: { update: jest.Mock; updateMany: jest.Mock };
    refreshToken: { deleteMany: jest.Mock };
    section: { findUnique: jest.Mock; findMany: jest.Mock };
    $transaction: jest.Mock;
  };
  let redis: { delPattern: jest.Mock; delMany: jest.Mock };
  let mail: { send: jest.Mock };
  let logger: {
    log: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
    verbose: jest.Mock;
  };

  const tx = {
    user: { update: jest.fn(), updateMany: jest.fn() },
    auth: { update: jest.fn(), updateMany: jest.fn() },
    refreshToken: { deleteMany: jest.fn() },
  };

  const student = (over: Record<string, unknown> = {}) => ({
    id: 'student-1',
    role: 'Student',
    isActive: true,
    sectionId: 'section-a',
    auth: { authId: 'nnpu1SB26KA001' },
    details: { name: 'Asha', email: 'asha@example.com' },
    ...over,
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    logger = {
      log: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      verbose: jest.fn(),
    };

    tx.user.update.mockResolvedValue({});
    tx.auth.update.mockResolvedValue({});
    tx.auth.updateMany.mockResolvedValue({ count: 1 });
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

    prisma = {
      user: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      auth: { update: jest.fn(), updateMany: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      section: { findUnique: jest.fn(), findMany: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((cb: (t: unknown) => unknown) => cb(tx)),
    };
    redis = {
      delPattern: jest.fn().mockResolvedValue(1),
      delMany: jest.fn().mockResolvedValue(1),
    };
    mail = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: MailService, useValue: mail },
        {
          provide: LoggerService,
          useValue: logger,
        },
      ],
    }).compile();

    service = module.get(UsersService);
  });

  describe('deactivate', () => {
    it('deactivates and kills sessions in one transaction', async () => {
      prisma.user.findUnique.mockResolvedValue(student());

      await expect(
        service.setActive('student-1', false, 'admin-1'),
      ).resolves.toEqual({
        userId: 'student-1',
        isActive: false,
        unchanged: false,
      });

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'student-1' },
        data: { isActive: false },
      });
      // jwt-auth.guard enforces isActive, but a live access token outlives the
      // flag until it expires, and refresh() would happily mint a new pair.
      // `updateMany` rather than `update`: the revocation helper is shared with
      // the bulk pass-out, which revokes for a whole cohort in one statement.
      expect(tx.auth.updateMany).toHaveBeenCalledWith({
        where: { authId: { in: ['nnpu1SB26KA001'] } },
        data: { tokenVersion: { increment: 1 } },
      });
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: { in: ['nnpu1SB26KA001'] } },
      });
      expect(redis.delPattern).toHaveBeenCalledWith('me:nnpu1SB26KA001');
    });

    it('refuses to deactivate the caller', async () => {
      prisma.user.findUnique.mockResolvedValue(student());

      await expect(
        service.setActive('student-1', false, 'nnpu1SB26KA001'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('refuses to deactivate the last active admin', async () => {
      prisma.user.findUnique.mockResolvedValue(
        student({ role: 'Admin', auth: { authId: 'admin-1' } }),
      );
      prisma.user.count.mockResolvedValue(0);

      await expect(
        service.setActive('admin-1', false, 'admin-2'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('allows deactivating an admin when another remains', async () => {
      prisma.user.findUnique.mockResolvedValue(
        student({ role: 'Admin', auth: { authId: 'admin-1' } }),
      );
      prisma.user.count.mockResolvedValue(1);

      await expect(
        service.setActive('admin-1', false, 'admin-2'),
      ).resolves.toMatchObject({ isActive: false });
    });

    it('is a no-op when already in the requested state', async () => {
      prisma.user.findUnique.mockResolvedValue(student({ isActive: false }));

      await expect(
        service.setActive('student-1', false, 'admin-1'),
      ).resolves.toMatchObject({ unchanged: true });

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('does not bump tokenVersion on reactivation', async () => {
      prisma.user.findUnique.mockResolvedValue(student({ isActive: false }));

      await service.setActive('student-1', true, 'admin-1');

      expect(tx.user.update).toHaveBeenCalledWith({
        where: { id: 'student-1' },
        data: { isActive: true },
      });
      expect(tx.auth.updateMany).not.toHaveBeenCalled();
      expect(tx.refreshToken.deleteMany).not.toHaveBeenCalled();
    });

    it('404s for an unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.setActive('nope', false, 'admin-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('succeeds even when cache invalidation fails', async () => {
      prisma.user.findUnique.mockResolvedValue(student());
      redis.delPattern.mockRejectedValue(new Error('redis down'));

      await expect(
        service.setActive('student-1', false, 'admin-1'),
      ).resolves.toMatchObject({ isActive: false });
    });
  });

  describe('transferStudent', () => {
    it('moves the student and clears the caches that embed the section', async () => {
      prisma.user.findUnique.mockResolvedValue(student());
      prisma.section.findUnique.mockResolvedValue({ id: 'section-b' });

      await expect(
        service.transferStudent('student-1', {
          sectionId: 'section-b',
        }),
      ).resolves.toMatchObject({
        studentId: 'student-1',
        fromSectionId: 'section-a',
        toSectionId: 'section-b',
      });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { id: 'student-1' },
        data: { sectionId: 'section-b' },
      });
      // The cached profile carries the section name; rosters are keyed per
      // section. Both go stale on a transfer.
      expect(redis.delPattern).toHaveBeenCalledWith('me:nnpu1SB26KA001');
      expect(redis.delPattern).toHaveBeenCalledWith('attendance:roster:*');
    });

    it('refuses a non-student', async () => {
      prisma.user.findUnique.mockResolvedValue(student({ role: 'Teacher' }));

      await expect(
        service.transferStudent('student-1', {
          sectionId: 'section-b',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('refuses a deactivated student', async () => {
      prisma.user.findUnique.mockResolvedValue(student({ isActive: false }));

      await expect(
        service.transferStudent('student-1', {
          sectionId: 'section-b',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses a transfer to the current section', async () => {
      prisma.user.findUnique.mockResolvedValue(student());

      await expect(
        service.transferStudent('student-1', {
          sectionId: 'section-a',
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('404s for an unknown target section', async () => {
      prisma.user.findUnique.mockResolvedValue(student());
      prisma.section.findUnique.mockResolvedValue(null);

      await expect(
        service.transferStudent('student-1', {
          sectionId: 'nope',
        }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('passOutStudents', () => {
    const SEC_A = 'section-a';
    const SEC_B = 'section-b';

    const section = (
      id: string,
      name: string,
      classTeacherId: string | null = null,
    ) => ({
      id,
      name,
      classTeacherId,
    });

    const bulkStudent = (
      id: string,
      sectionId: string,
      authId: string,
      over: Record<string, unknown> = {},
    ) => ({
      id,
      isActive: true,
      sectionId,
      auth: { authId },
      details: { name: `Student ${id}` },
      ...over,
    });

    const dto = (
      sectionIds: string[],
      over: Record<string, unknown> = {},
    ): PassOutStudentsDto => ({
      sections: sectionIds.map((sectionId) => ({ sectionId })),
      ...over,
    });

    beforeEach(() => {
      // Mirrors `where: { id: { in: sectionIds } }`: only ever returns rows the
      // caller asked for.
      prisma.section.findMany = jest
        .fn()
        .mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve(
            [section(SEC_A, '2-SCI-A'), section(SEC_B, '2-COM-B')].filter((s) =>
              where.id.in.includes(s.id),
            ),
          ),
        );
      prisma.user.findMany = jest.fn().mockResolvedValue([]);
      // Realistic: Postgres reports how many rows it actually touched, which
      // is the count the service returns.
      tx.user.updateMany = jest
        .fn()
        .mockImplementation(({ where }: { where: { id: { in: string[] } } }) =>
          Promise.resolve({ count: where.id.in.length }),
        );
      redis.delMany = jest.fn().mockResolvedValue(2);
    });

    it('deactivates every active student and revokes their sessions', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'nnpu1SB26KA001'),
        bulkStudent('s2', SEC_A, 'nnpu1SB26KA002'),
      ]);

      const result = await service.passOutStudents(dto([SEC_A]));

      expect(result.deactivated).toBe(2);
      expect(result.sections).toEqual([
        { sectionId: SEC_A, sectionName: '2-SCI-A', passedOut: 2 },
      ]);

      expect(tx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: ['s1', 's2'] }, isActive: true },
        data: { isActive: false },
      });
      // Without this, a "deactivated" cohort keeps logging in on live refresh
      // tokens and the whole operation is a no-op in practice.
      expect(tx.auth.updateMany).toHaveBeenCalledWith({
        where: { authId: { in: ['nnpu1SB26KA001', 'nnpu1SB26KA002'] } },
        data: { tokenVersion: { increment: 1 } },
      });
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: { in: ['nnpu1SB26KA001', 'nnpu1SB26KA002'] } },
      });
      expect(redis.delMany).toHaveBeenCalledWith([
        'me:nnpu1SB26KA001',
        'me:nnpu1SB26KA002',
      ]);
    });

    it('clears the cached attendance roster', async () => {
      // The roster is derived from `User.sectionId` + `isActive`, and was
      // otherwise only cleared when attendance is *marked*. A teacher could
      // pass-out a cohort, open its roster and still mark every one of them.
      prisma.user.findMany.mockResolvedValue([bulkStudent('s1', SEC_A, 'a1')]);

      await service.passOutStudents(dto([SEC_A]));

      expect(redis.delPattern).toHaveBeenCalledWith('attendance:*');
    });

    it('writes nothing on a dry run', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'nnpu1SB26KA001'),
      ]);

      const result = await service.passOutStudents(
        dto([SEC_A], { dryRun: true }),
      );

      expect(result).toMatchObject({ dryRun: true, deactivated: 0 });
      expect(result.sections[0]).toMatchObject({ passedOut: 1 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.user.updateMany).not.toHaveBeenCalled();
      expect(redis.delMany).not.toHaveBeenCalled();
      expect(redis.delPattern).not.toHaveBeenCalledWith('attendance:*');
    });

    it('passes out several sections in one call', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'a1'),
        bulkStudent('s2', SEC_A, 'a2'),
        bulkStudent('s3', SEC_B, 'b1'),
      ]);

      const result = await service.passOutStudents(dto([SEC_A, SEC_B]));

      expect(result.deactivated).toBe(3);
      expect(result.sections).toEqual([
        { sectionId: SEC_A, sectionName: '2-SCI-A', passedOut: 2 },
        { sectionId: SEC_B, sectionName: '2-COM-B', passedOut: 1 },
      ]);
    });

    it('counts already-inactive students instead of touching them', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'a1'),
        bulkStudent('s2', SEC_A, 'a2', { isActive: false }),
      ]);

      const result = await service.passOutStudents(dto([SEC_A]));

      expect(result.alreadyInactive).toBe(1);
      expect(result.deactivated).toBe(1);
      const calls = (
        tx.user.updateMany as unknown as { mock: { calls: unknown[] } }
      ).mock.calls as [{ where: { id: { in: string[] } } }][];
      expect(calls[0][0].where.id.in).toEqual(['s1']);
    });

    it('re-scopes the write to isActive: true so a concurrent reactivation survives', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'a1'),
        bulkStudent('s2', SEC_A, 'a2'),
      ]);

      await service.passOutStudents(dto([SEC_A]));

      const calls = (
        tx.user.updateMany as unknown as { mock: { calls: unknown[] } }
      ).mock.calls as [{ where: { isActive: boolean } }][];
      expect(calls[0][0].where.isActive).toBe(true);
    });

    it('leaves the class teacher alone and says why', async () => {
      prisma.section.findMany.mockResolvedValue([
        section(SEC_A, '2-SCI-A', 'teacher-1'),
      ]);
      prisma.user.findMany
        .mockResolvedValueOnce([bulkStudent('s1', SEC_A, 'a1')])
        .mockResolvedValueOnce([
          { id: 'teacher-1', role: 'Teacher', details: { name: 'Asha' } },
        ]);

      const result = await service.passOutStudents(dto([SEC_A]));

      expect(result.deactivated).toBe(1);
      expect(result.classTeachersUntouched).toEqual([
        {
          name: 'Asha',
          reason: 'is the Teacher class teacher, so their account is untouched',
        },
      ]);
      // The teacher is not in the update set.
      const calls = (
        tx.user.updateMany as unknown as { mock: { calls: unknown[] } }
      ).mock.calls as [{ where: { id: { in: string[] } } }][];
      expect(calls[0][0].where.id.in).toEqual(['s1']);
    });

    it('only selects students, never staff who happen to share the id list', async () => {
      await service.passOutStudents(dto([SEC_A]));

      const findCalls = prisma.user.findMany.mock.calls as unknown as [
        { where: { role?: string } },
      ][];
      expect(findCalls[0][0].where.role).toBe('Student');
    });

    it('does nothing at all when every student is already inactive', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'a1', { isActive: false }),
      ]);

      const result = await service.passOutStudents(dto([SEC_A]));

      expect(result).toMatchObject({ deactivated: 0, alreadyInactive: 1 });
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('reports which section ids do not exist', async () => {
      await expect(
        service.passOutStudents(dto([SEC_A, 'ghost-1'])),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.passOutStudents(dto([SEC_A, 'ghost-1'])),
      ).rejects.toThrow(/ghost-1/);
    });

    it('logs the reason so "why did these accounts go inactive" is answerable', async () => {
      prisma.user.findMany.mockResolvedValue([bulkStudent('s1', SEC_A, 'a1')]);

      await service.passOutStudents(
        dto([SEC_A], { reason: 'Completed 2nd PUC' }),
      );

      expect(logger.log).toHaveBeenCalledWith(
        expect.stringContaining('Completed 2nd PUC'),
      );
    });

    it('tolerates a student with no auth row', async () => {
      prisma.user.findMany.mockResolvedValue([
        bulkStudent('s1', SEC_A, 'a1'),
        bulkStudent('s2', SEC_A, '', { auth: null }),
      ]);

      const result = await service.passOutStudents(dto([SEC_A]));

      // The account is still deactivated; there are just no sessions to revoke.
      expect(result.deactivated).toBe(2);
      expect(redis.delMany).toHaveBeenCalledWith(['me:a1']);
    });
  });

  describe('resetPassword', () => {
    it('emails a temp password and revokes sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(student());

      const result = await service.resetPassword('student-1');

      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'asha@example.com' }),
      );
      // resetPassword sets the password and bumps tokenVersion in one
      // `auth.update`, so it does not go through the shared revocation helper
      // (which `setActive` and the bulk pass-out use).
      const authUpdateMock = tx.auth.update as unknown as jest.Mock<
        unknown,
        [{ where: unknown; data: Record<string, unknown> }]
      >;
      expect(authUpdateMock.mock.calls[0][0].where).toEqual({
        authId: 'nnpu1SB26KA001',
      });
      expect(authUpdateMock.mock.calls[0][0].data.tokenVersion).toEqual({
        increment: 1,
      });
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: 'nnpu1SB26KA001' },
      });
      expect(result).toMatchObject({ userId: 'student-1' });
    });

    it('sends the mail before committing the password change', async () => {
      // Order is the whole point, so it is asserted directly. Asserting only
      // "auth update not called on failure" is not enough: a write-before-email
      // implementation using prisma.auth instead of the transaction would
      // slip past that.
      const order: string[] = [];
      prisma.user.findUnique.mockResolvedValue(student());
      mail.send.mockImplementation(() => {
        order.push('mail');
        return Promise.resolve();
      });
      tx.auth.update.mockImplementation(() => {
        order.push('write');
        return Promise.resolve({});
      });

      await service.resetPassword('student-1');

      expect(order).toEqual(['mail', 'write']);
    });

    it('leaves the password untouched when the email fails', async () => {
      prisma.user.findUnique.mockResolvedValue(student());
      mail.send.mockRejectedValue(new Error('smtp down'));

      await expect(service.resetPassword('student-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      // Sending first means both failure modes leave the old password working:
      // SMTP fails -> nothing changed; write fails -> emailed password is simply
      // invalid. The reverse ordering locks the user out entirely.
      expect(prisma.$transaction).not.toHaveBeenCalled();
      expect(tx.auth.update).not.toHaveBeenCalled();
      expect(prisma.auth.update).not.toHaveBeenCalled();
    });

    it('refuses when the user has no email on file', async () => {
      prisma.user.findUnique.mockResolvedValue(
        student({ details: { name: 'Asha', email: null } }),
      );

      await expect(service.resetPassword('student-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(mail.send).not.toHaveBeenCalled();
    });

    it('refuses a user with no auth record', async () => {
      prisma.user.findUnique.mockResolvedValue(student({ auth: null }));

      await expect(service.resetPassword('student-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });
});
