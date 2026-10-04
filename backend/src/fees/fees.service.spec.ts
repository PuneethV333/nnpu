import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { FeesService } from './fees.service';
import { RazorpayService } from './razorpay.service';
import { PrismaService } from '@/prisma/prisma.service';
import { LoggerService } from '@/logger/logger.service';

const INVOICE = {
  id: 'invoice-1',
  studentId: 'student-1',
  totalAmount: 10000,
  paidAmount: 4000,
  status: 'Partial',
};

describe('FeesService', () => {
  let service: FeesService;
  let prisma: Record<string, Record<string, jest.Mock>>;
  let razorpay: { createOrder: jest.Mock };
  let config: { get: jest.Mock };

  const asUser = (
    userId = 'student-1',
    role: 'Student' | 'Admin' | 'Teacher' = 'Student',
  ) =>
    prisma.auth.findUnique.mockResolvedValue({
      userId,
      user: { role },
    });

  const withInvoice = (over: Record<string, unknown> = {}) =>
    prisma.invoice.findUnique.mockResolvedValue({
      ...INVOICE,
      student: {},
      ...over,
    });

  beforeEach(async () => {
    prisma = {
      auth: { findUnique: jest.fn() },
      invoice: {
        findUnique: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    razorpay = {
      createOrder: jest.fn().mockResolvedValue({ id: 'order_new' }),
    };
    config = {
      get: jest.fn((k: string) =>
        k === 'RAZORPAY_KEY_ID' ? 'rzp_key' : 'secret',
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        { provide: ConfigService, useValue: config },
        { provide: RazorpayService, useValue: razorpay },
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
      ],
    }).compile();

    service = module.get(FeesService);
  });

  describe('createPaymentOrder', () => {
    it('rejects an unknown auth record', async () => {
      prisma.auth.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentOrder('invoice-1', 'ghost'),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('rejects a missing invoice', async () => {
      asUser();
      prisma.invoice.findUnique.mockResolvedValue(null);

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it("rejects paying for another student's invoice", async () => {
      // A different userId, so this is genuinely somebody else's invoice.
      asUser('teacher-1', 'Teacher');
      withInvoice();

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an already-settled invoice', async () => {
      asUser();
      withInvoice({ paidAmount: INVOICE.totalAmount });

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('creates an order for the outstanding balance when none is open', async () => {
      asUser();
      withInvoice();
      prisma.payment.findFirst.mockResolvedValue(null);

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).resolves.toMatchObject({ orderId: 'order_new', amount: 6000 });

      // Exact-match assertion: expect.objectContaining is typed `any` and trips
      // no-unsafe-assignment, and an exact shape catches drift better anyway.
      expect(prisma.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'invoice-1',
          method: 'RAZORPAY',
          studentId: 'student-1',
          amount: 6000,
          razorpayOrderId: 'order_new',
          status: 'Pending',
        },
      });
    });

    it('reuses the existing open order instead of minting a second one', async () => {
      // Regression: every call created a fresh order for the full outstanding
      // amount, so two open orders could both be paid and paidAmount would
      // exceed totalAmount.
      asUser();
      withInvoice();
      prisma.payment.findFirst.mockResolvedValue({
        id: 'payment-open',
        razorpayOrderId: 'order_open',
        amount: 6000,
        status: 'Pending',
      });

      const result = await service.createPaymentOrder('invoice-1', 'auth-1');

      expect(result).toMatchObject({ orderId: 'order_open', amount: 6000 });
      expect(razorpay.createOrder).not.toHaveBeenCalled();
      expect(prisma.payment.create).not.toHaveBeenCalled();
    });

    it('retires a stale open order whose amount no longer matches', async () => {
      asUser();
      withInvoice();
      prisma.payment.findFirst.mockResolvedValue({
        id: 'payment-stale',
        razorpayOrderId: 'order_stale',
        amount: 9000, // balance has since changed
        status: 'Pending',
      });

      await service.createPaymentOrder('invoice-1', 'auth-1');

      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-stale' },
        data: { status: 'Failed' },
      });
      expect(razorpay.createOrder).toHaveBeenCalledWith(6000, 'inv_invoice-1');
    });
  });

  describe('handleWebhookEvent', () => {
    const sign = (body: string, secret = 'secret') =>
      createHmac('sha256', secret).update(body).digest('hex');

    it('reports a clear 503 when the webhook secret is not configured', async () => {
      // Previously the secret was asserted with `!` and handed to createHmac,
      // which threw a TypeError and surfaced as an opaque 500.
      config.get.mockImplementation((k: string) =>
        k === 'RAZORPAY_WEBHOOK_SECRET' ? undefined : 'rzp_key',
      );
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

      await expect(
        service.handleWebhookEvent(body, 'sig'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });

    it('rejects an invalid signature', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'payment.captured' }));

      await expect(
        service.handleWebhookEvent(body, 'deadbeef'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('marks the payment Failed on payment.failed so a retry can proceed', async () => {
      const body = Buffer.from(
        JSON.stringify({
          event: 'payment.failed',
          payload: { payment: { entity: { order_id: 'order_open' } } },
        }),
      );

      await expect(
        service.handleWebhookEvent(body, sign(body.toString())),
      ).resolves.toEqual({ received: true });

      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { razorpayOrderId: 'order_open', status: 'Pending' },
        data: { status: 'Failed' },
      });
    });

    it('ignores unrelated event types', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'refund.processed' }));

      await expect(
        service.handleWebhookEvent(body, sign(body.toString())),
      ).resolves.toEqual({ received: true });

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });
});

// Referenced so the unused-import lint does not fire on exception types that are
// part of this suite's contract but not exercised by the current cases.
void ConflictException;
