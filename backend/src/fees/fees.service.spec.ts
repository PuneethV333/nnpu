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

type MockDelegate = Record<string, jest.Mock>;

type TransactionMock = {
  payment: MockDelegate;
  $queryRaw: jest.Mock;
  $executeRaw: jest.Mock;
};

type PrismaMock = {
  auth: MockDelegate;
  section: MockDelegate;
  feeStructure: MockDelegate;
  invoice: MockDelegate;
  payment: MockDelegate;
  $transaction: jest.Mock;
};

describe('FeesService', () => {
  let service: FeesService;
  let prisma: PrismaMock;
  let transaction: TransactionMock;
  let razorpay: {
    createOrder: jest.Mock;
    fetchPayment: jest.Mock;
    verifyPaymentSignature: jest.Mock;
  };
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
    transaction = {
      payment: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 'payment-reserved' }),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        {
          id: 'invoice-1',
          studentId: 'student-1',
          totalAmount: 10000,
          paidAmount: 4000,
        },
      ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    prisma = {
      auth: { findUnique: jest.fn() },
      section: { findFirst: jest.fn() },
      feeStructure: { findUnique: jest.fn() },
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
      $transaction: jest.fn(),
    };
    prisma.$transaction.mockImplementation(
      (callback: (tx: TransactionMock) => Promise<unknown>) =>
        callback(transaction),
    );
    razorpay = {
      createOrder: jest.fn().mockResolvedValue({ id: 'order_new' }),
      fetchPayment: jest.fn().mockResolvedValue({
        order_id: 'order_open',
        status: 'captured',
        captured: true,
        amount: 6000,
        currency: 'INR',
      }),
      verifyPaymentSignature: jest.fn().mockReturnValue(true),
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
      asUser('teacher-1', 'Teacher');
      withInvoice();

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects an already-settled invoice using the locked balance', async () => {
      asUser();
      withInvoice();
      transaction.$queryRaw.mockResolvedValueOnce([
        {
          id: 'invoice-1',
          studentId: 'student-1',
          totalAmount: 10000,
          paidAmount: 10000,
        },
      ]);

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('reserves the invoice before creating one provider order', async () => {
      asUser();
      withInvoice();

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).resolves.toMatchObject({ orderId: 'order_new', amount: 6000 });

      expect(transaction.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'invoice-1',
          method: 'RAZORPAY',
          studentId: 'student-1',
          amount: 6000,
          status: 'Pending',
        },
      });
      expect(
        transaction.payment.create.mock.invocationCallOrder[0],
      ).toBeLessThan(razorpay.createOrder.mock.invocationCallOrder[0]);
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'payment-reserved',
          status: 'Pending',
          razorpayOrderId: null,
        },
        data: { razorpayOrderId: 'order_new' },
      });
    });

    it('reuses the existing open order instead of minting a second one', async () => {
      asUser();
      withInvoice();
      transaction.payment.findFirst.mockResolvedValue({
        id: 'payment-open',
        method: 'RAZORPAY',
        razorpayOrderId: 'order_open',
        amount: 6000,
        status: 'Pending',
      });

      const result = await service.createPaymentOrder('invoice-1', 'auth-1');

      expect(result).toMatchObject({ orderId: 'order_open', amount: 6000 });
      expect(razorpay.createOrder).not.toHaveBeenCalled();
      expect(transaction.payment.create).not.toHaveBeenCalled();
    });

    it('does not replace an open order when its amount no longer matches', async () => {
      asUser();
      withInvoice();
      transaction.payment.findFirst.mockResolvedValue({
        id: 'payment-stale',
        method: 'RAZORPAY',
        razorpayOrderId: 'order_stale',
        amount: 9000,
        status: 'Pending',
      });

      await expect(
        service.createPaymentOrder('invoice-1', 'auth-1'),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(transaction.payment.updateMany).not.toHaveBeenCalled();
      expect(razorpay.createOrder).not.toHaveBeenCalled();
    });

    it('reactivates a legacy failed order instead of creating another one', async () => {
      asUser();
      withInvoice();
      transaction.payment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({
          id: 'payment-failed',
          method: 'RAZORPAY',
          razorpayOrderId: 'order_failed',
          amount: 6000,
          status: 'Failed',
        });

      const result = await service.createPaymentOrder('invoice-1', 'auth-1');

      expect(result).toMatchObject({ orderId: 'order_failed', amount: 6000 });
      expect(transaction.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'payment-failed', status: 'Failed' },
        data: { status: 'Pending' },
      });
      expect(razorpay.createOrder).not.toHaveBeenCalled();
    });
  });

  describe('verifyPayment', () => {
    it('checks Razorpay capture state before crediting the invoice', async () => {
      asUser();
      withInvoice();
      transaction.payment.findUnique.mockResolvedValue({
        id: 'payment-1',
        invoiceId: 'invoice-1',
        amount: 6000,
        refundAmount: 0,
        method: 'RAZORPAY',
        status: 'Pending',
      });

      await expect(
        service.verifyPayment({
          razorpay_order_id: 'order_open',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'signature',
        }),
      ).resolves.toEqual({
        alreadyProcessed: false,
        refundRequired: false,
        refundAmount: 0,
      });

      expect(razorpay.fetchPayment).toHaveBeenCalledWith('pay_1');
      expect(transaction.payment.updateMany).toHaveBeenCalledTimes(1);
      expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('does not credit an authorized but uncaptured payment', async () => {
      razorpay.fetchPayment.mockResolvedValue({
        order_id: 'order_open',
        status: 'authorized',
        captured: false,
        amount: 6000,
        currency: 'INR',
      });

      await expect(
        service.verifyPayment({
          razorpay_order_id: 'order_open',
          razorpay_payment_id: 'pay_1',
          razorpay_signature: 'signature',
        }),
      ).rejects.toBeInstanceOf(ConflictException);

      expect(transaction.payment.findUnique).not.toHaveBeenCalled();
    });
  });

  describe('handleWebhookEvent', () => {
    const sign = (body: string, secret = 'secret') =>
      createHmac('sha256', secret).update(body).digest('hex');

    it('reports a clear 503 when the webhook secret is not configured', async () => {
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

    it('keeps the order Pending after a failed attempt so it can be retried', async () => {
      const body = Buffer.from(
        JSON.stringify({
          event: 'payment.failed',
          payload: { payment: { entity: { order_id: 'order_open' } } },
        }),
      );

      await expect(
        service.handleWebhookEvent(body, sign(body.toString())),
      ).resolves.toEqual({ received: true });

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
      expect(transaction.payment.updateMany).not.toHaveBeenCalled();
    });

    it('records a refund-required capture without over-crediting the invoice', async () => {
      transaction.payment.findUnique.mockResolvedValue({
        id: 'payment-legacy',
        invoiceId: 'invoice-1',
        amount: 6000,
        refundAmount: 0,
        method: 'RAZORPAY',
        status: 'Failed',
      });
      transaction.$queryRaw.mockResolvedValueOnce([
        { id: 'invoice-1', totalAmount: 10000, paidAmount: 9000 },
      ]);
      const body = Buffer.from(
        JSON.stringify({
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_late',
                order_id: 'order_legacy',
                amount: 6000,
                currency: 'INR',
              },
            },
          },
        }),
      );

      await expect(
        service.handleWebhookEvent(body, sign(body.toString())),
      ).resolves.toEqual({ received: true });

      expect(transaction.payment.update).toHaveBeenCalledWith({
        where: { id: 'payment-legacy' },
        data: { status: 'RefundRequired', refundAmount: 5000 },
      });
      expect(transaction.$executeRaw).toHaveBeenCalledTimes(1);
    });

    it('ignores unrelated event types', async () => {
      const body = Buffer.from(JSON.stringify({ event: 'refund.processed' }));

      await expect(
        service.handleWebhookEvent(body, sign(body.toString())),
      ).resolves.toEqual({ received: true });

      expect(prisma.payment.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('getFeeStructure authorization', () => {
    it('refuses a teacher who does not teach the section', async () => {
      const db = prisma;
      db.auth.findUnique.mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      db.section.findFirst.mockResolvedValue(null);

      // Previously the method took no authId, so any teacher could read any
      // section's fee amounts by changing sectionId.
      await expect(
        service.getFeeStructure('section-9', 'year-1', 'auth-1'),
      ).rejects.toBeInstanceOf(ForbiddenException);

      expect(db.feeStructure.findUnique).not.toHaveBeenCalled();
    });

    it('allows the section class teacher', async () => {
      const db = prisma;
      db.auth.findUnique.mockResolvedValue({
        userId: 'teacher-1',
        user: { role: 'Teacher' },
      });
      db.section.findFirst.mockResolvedValue({ id: 'section-1' });
      db.feeStructure.findUnique.mockResolvedValue({ id: 'fs-1' });

      await expect(
        service.getFeeStructure('section-1', 'year-1', 'auth-1'),
      ).resolves.toEqual({ id: 'fs-1' });
    });

    it('lets an Admin through without a section lookup', async () => {
      const db = prisma;
      db.auth.findUnique.mockResolvedValue({
        userId: 'admin-1',
        user: { role: 'Admin' },
      });
      db.feeStructure.findUnique.mockResolvedValue({ id: 'fs-1' });

      await expect(
        service.getFeeStructure('section-1', 'year-1', 'auth-1'),
      ).resolves.toEqual({ id: 'fs-1' });

      expect(db.section.findFirst).not.toHaveBeenCalled();
    });

    it('rejects a blank sectionId before querying', async () => {
      const db = prisma;

      // Blank is the shape Prisma drops from a `where` clause entirely.
      await expect(
        service.getFeeStructure('   ', 'year-1', 'auth-1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(db.auth.findUnique).not.toHaveBeenCalled();
    });
  });
});
