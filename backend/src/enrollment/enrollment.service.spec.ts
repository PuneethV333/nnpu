import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { EnrollmentService } from './enrollment.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';
import { MailService } from '@/mail/mail.service';
import { GoogleFormsService } from '@/google/google-forms.service';

const SUBMISSION = {
  id: 'sub-1',
  driveId: 'drive-1',
  name: 'Asha',
  email: 'asha@example.com',
  stream: 'Science',
  session: 'A',
  combinationId: 'combo-1',
  language: 'Kannada',
  status: 'Pending',
  promotedUserId: null,
};

describe('EnrollmentService', () => {
  let service: EnrollmentService;
  /** Explicit shape: Prisma delegates are tables of mocks, $transaction a function. */
  interface PrismaMocks {
    enrollmentSubmission: {
      findUnique: jest.Mock;
      updateMany: jest.Mock;
      update: jest.Mock;
    };
    enrollmentDrive: { findUniqueOrThrow: jest.Mock; update: jest.Mock };
    academicYear: { findUniqueOrThrow: jest.Mock };
    class: { findUniqueOrThrow: jest.Mock };
    section: { findUnique: jest.Mock };
    combination: { findUniqueOrThrow: jest.Mock };
    idSequence: { upsert: jest.Mock; update: jest.Mock };
    user: { create: jest.Mock };
    auth: { findFirst: jest.Mock; update: jest.Mock };
    $transaction: jest.Mock;
  }

  let prisma: PrismaMocks;
  let mail: { send: jest.Mock<Promise<void>, [unknown]> };

  /** Drives promoteOne up to the point where the account is created. */
  const stubPromotionLookups = () => {
    prisma.enrollmentSubmission.findUnique.mockResolvedValue(SUBMISSION);
    prisma.enrollmentSubmission.updateMany.mockResolvedValue({ count: 1 });
    prisma.enrollmentDrive.findUniqueOrThrow.mockResolvedValue({
      academicYearId: 'ay-1',
    });
    prisma.academicYear.findUniqueOrThrow.mockResolvedValue({
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    prisma.class.findUniqueOrThrow.mockResolvedValue({ id: 'class-1' });
    prisma.section.findUnique.mockResolvedValue({ id: 'section-1' });
    prisma.combination.findUniqueOrThrow.mockResolvedValue({
      id: 'combo-1',
      idCode: 'PCMB', // must exist in COMBO_CODE
    });
    prisma.idSequence.upsert.mockResolvedValue({});
    prisma.idSequence.update.mockResolvedValue({ current: 1 });
    prisma.user.create.mockResolvedValue({ id: 'user-1' });
  };

  beforeEach(async () => {
    prisma = {
      enrollmentSubmission: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      enrollmentDrive: {
        findUniqueOrThrow: jest.fn(),
        update: jest.fn(),
      },
      academicYear: { findUniqueOrThrow: jest.fn() },
      class: { findUniqueOrThrow: jest.fn() },
      section: { findUnique: jest.fn() },
      combination: { findUniqueOrThrow: jest.fn() },
      idSequence: { upsert: jest.fn(), update: jest.fn() },
      user: { create: jest.fn() },
      auth: { findFirst: jest.fn(), update: jest.fn() },
      $transaction: jest.fn(),
    };
    mail = {
      send: jest
        .fn<Promise<void>, [unknown]>()
        .mockImplementation(() => Promise.resolve()),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnrollmentService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: LoggerService,
          useValue: {
            log: jest.fn(),
            warn: jest.fn(),
            error: jest.fn(),
            verbose: jest.fn(),
          },
        },
        { provide: MailService, useValue: mail },
        { provide: GoogleFormsService, useValue: {} },
      ],
    }).compile();

    service = module.get(EnrollmentService);
  });

  describe('promoteOne email failure', () => {
    beforeEach(() => {
      stubPromotionLookups();
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb(prisma),
      );
    });

    it('leaves the submission Promoted when only the email fails', async () => {
      mail.send.mockRejectedValue(new Error('SMTP 421'));

      await expect(service.promoteOne('sub-1')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );

      // Regression: the mail send shared a try/catch with the creation
      // transaction, so an SMTP failure reset the status while the User and
      // Auth rows stayed committed — leaving an account nobody could be
      // promoted into ever again.
      // `update` is legitimately used inside the transaction to record
      // promotedUserId; what must never happen is the status reverting.
      expect(prisma.enrollmentSubmission.update).not.toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'Pending' },
      });
    });

    it('reports the failure as a delivery problem, not a creation problem', async () => {
      mail.send.mockRejectedValue(new Error('SMTP 421'));

      await expect(service.promoteOne('sub-1')).rejects.toThrow(
        /credentials email could not be sent/i,
      );
    });

    it('still resets to Pending when the creation transaction itself fails', async () => {
      prisma.$transaction.mockRejectedValue(new Error('P2002 duplicate key'));

      await expect(service.promoteOne('sub-1')).rejects.toThrow(
        'P2002 duplicate key',
      );

      // Nothing was committed, so the submission must be retryable.
      expect(prisma.enrollmentSubmission.update).toHaveBeenCalledWith({
        where: { id: 'sub-1' },
        data: { status: 'Pending' },
      });
    });
  });

  describe('resendCredentials', () => {
    it('refuses a submission that was never promoted', async () => {
      prisma.enrollmentSubmission.findUnique.mockResolvedValue(SUBMISSION);

      await expect(service.resendCredentials('sub-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('resets the password and re-sends', async () => {
      prisma.enrollmentSubmission.findUnique.mockResolvedValue({
        ...SUBMISSION,
        status: 'Promoted',
        promotedUserId: 'user-1',
      });
      prisma.auth.findFirst.mockResolvedValue({
        id: 'auth-1',
        authId: 'nnpu1SB26KA001',
      });
      prisma.auth.update.mockResolvedValue({});

      const result = await service.resendCredentials('sub-1');

      expect(result).toEqual({
        resent: true,
        authId: 'nnpu1SB26KA001',
      });
      // A fresh password must be issued, not the old one re-sent. Asserting the
      // recorded call's shape avoids expect.any (typed `any`).
      const updateMock = prisma.auth.update as unknown as jest.Mock<
        unknown,
        [{ data: { password: string; tokenVersion: { increment: number } } }]
      >;
      const arg = updateMock.mock.calls[0][0];

      expect(updateMock.mock.calls[0][0]).toBeDefined();
      expect(typeof arg.data.password).toBe('string');
      expect(arg.data.password.length).toBeGreaterThan(0);
      expect(arg.data.tokenVersion).toEqual({ increment: 1 });
      expect(mail.send).toHaveBeenCalledWith(
        expect.objectContaining({ to: 'asha@example.com' }),
      );
    });

    it('404s when the promoted student has no auth record', async () => {
      prisma.enrollmentSubmission.findUnique.mockResolvedValue({
        ...SUBMISSION,
        status: 'Promoted',
        promotedUserId: 'user-1',
      });
      prisma.auth.findFirst.mockResolvedValue(null);

      await expect(service.resendCredentials('sub-1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('resendOrPromote', () => {
    it('resends rather than re-promoting an already promoted submission', async () => {
      prisma.enrollmentSubmission.findUnique.mockResolvedValue({
        ...SUBMISSION,
        status: 'Promoted',
        promotedUserId: 'user-1',
      });
      prisma.auth.findFirst.mockResolvedValue({
        id: 'auth-1',
        authId: 'nnpu1SB26KA001',
      });
      prisma.auth.update.mockResolvedValue({});

      const result = await service.resendOrPromote('sub-1');

      expect(result).toEqual({ resent: true, authId: 'nnpu1SB26KA001' });
      // Promoting again would hit the unique email and fail.
      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('promotes a pending submission', async () => {
      stubPromotionLookups();
      prisma.$transaction.mockImplementation((cb: (tx: unknown) => unknown) =>
        cb(prisma),
      );

      await service.resendOrPromote('sub-1');

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.auth.findFirst).not.toHaveBeenCalled();
    });
  });
  describe('unknown submission id', () => {
    it('404s instead of surfacing a 500', async () => {
      prisma.enrollmentSubmission.findUnique.mockResolvedValue(null);

      // findUniqueOrThrow would reject with Prisma's P2025, which the global
      // filter turns into a 500 for what is really a bad id in the URL.
      await expect(service.promoteOne('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.resendOrPromote('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
      await expect(service.resendCredentials('nope')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
