import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RedisService } from '@/redis/redis.service';
import { MailService } from '@/mail/mail.service';
import { LoggerService } from '@/logger/logger.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: {
    user: { findUnique: jest.Mock; update: jest.Mock; count: jest.Mock };
    auth: { update: jest.Mock };
    refreshToken: { deleteMany: jest.Mock };
    section: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };
  let redis: { delPattern: jest.Mock };
  let mail: { send: jest.Mock };

  const tx = {
    user: { update: jest.fn() },
    auth: { update: jest.fn() },
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

    tx.user.update.mockResolvedValue({});
    tx.auth.update.mockResolvedValue({});
    tx.refreshToken.deleteMany.mockResolvedValue({ count: 2 });

    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        count: jest.fn().mockResolvedValue(0),
      },
      auth: { update: jest.fn() },
      refreshToken: { deleteMany: jest.fn() },
      section: { findUnique: jest.fn() },
      $transaction: jest
        .fn()
        .mockImplementation((cb: (t: unknown) => unknown) => cb(tx)),
    };
    redis = { delPattern: jest.fn().mockResolvedValue(1) };
    mail = { send: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: prisma },
        { provide: RedisService, useValue: redis },
        { provide: MailService, useValue: mail },
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
      expect(tx.auth.update).toHaveBeenCalledWith({
        where: { authId: 'nnpu1SB26KA001' },
        data: { tokenVersion: { increment: 1 } },
      });
      expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
        where: { authId: 'nnpu1SB26KA001' },
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
      expect(tx.auth.update).not.toHaveBeenCalled();
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

  describe('resetPassword', () => {
    it('emails a temp password and revokes sessions', async () => {
      prisma.user.findUnique.mockResolvedValue(student());

      const result = await service.resetPassword('student-1');

      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'asha@example.com' }),
      );
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
      // "auth.update not called on failure" is not enough: a write-before-email
      // implementation using prisma.auth.update instead of the transaction would
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
