/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { FeesService } from './fees.service';
import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import { RazorpayService } from './razorpay.service';

describe('FeesService', () => {
  let service: FeesService;

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };

  const mockPrisma = {
    auth: { findUnique: jest.fn() },
    feeStructure: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    invoice: {
      count: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    user: { findMany: jest.fn() },
    $transaction: jest.fn(),
  };

  const mockRazorpay = {
    createOrder: jest.fn(),
    verifyPaymentSignature: jest.fn(),
  };

  const mockConfig = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeesService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: LoggerService, useValue: mockLogger },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: RazorpayService, useValue: mockRazorpay },
      ],
    }).compile();

    service = module.get<FeesService>(FeesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createFeeStructure', () => {
    it('throws a ConflictException if a structure already exists for the section+year', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue({ id: 'existing' });

      await expect(
        service.createFeeStructure({
          sectionId: 'sec-1',
          academicYearId: 'ay-1',
          tuitionFee: 5000000,
        } as any),
      ).rejects.toThrow('A fee structure already exists');
    });

    it('creates a fee structure with zeroed optional fees', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(null);
      mockPrisma.feeStructure.create.mockResolvedValue({ id: 'fs-1' });

      const result = await service.createFeeStructure({
        sectionId: 'sec-1',
        academicYearId: 'ay-1',
        tuitionFee: 5000000,
      } as any);

      expect(mockPrisma.feeStructure.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          examFee: 0,
          transportFee: 0,
          hostelFee: 0,
          otherFee: 0,
        }),
      });
      expect(result).toEqual({ id: 'fs-1' });
    });
  });

  describe('updateFeeStructure', () => {
    it('throws BadRequestException if invoices already exist against it', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue({ id: 'fs-1' });
      mockPrisma.invoice.count.mockResolvedValue(3);

      await expect(
        service.updateFeeStructure('fs-1', {} as any),
      ).rejects.toThrow('Cannot modify a fee structure');
    });
  });

  describe('verifyPayment', () => {
    const payload = {
      razorpay_order_id: 'order_1',
      razorpay_payment_id: 'pay_1',
      razorpay_signature: 'sig_1',
    };

    it('throws BadRequestException on an invalid signature', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(false);

      await expect(service.verifyPayment(payload)).rejects.toThrow(
        'Invalid signature',
      );
      expect(mockPrisma.payment.findFirst).not.toHaveBeenCalled();
    });

    it('is idempotent: skips reprocessing an already-Success payment', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        status: 'Success',
        amount: 100,
        invoiceId: 'inv-1',
        invoice: { paidAmount: 100, totalAmount: 100 },
      });

      const result = await service.verifyPayment(payload);

      expect(result).toEqual({ alreadyProcessed: true });
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('marks the invoice Paid when the increment covers the total amount', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        status: 'Pending',
        amount: 100,
        invoiceId: 'inv-1',
        invoice: { paidAmount: 0, totalAmount: 100 },
      });
      mockPrisma.$transaction.mockResolvedValue([{}, {}]);

      const result = await service.verifyPayment(payload);

      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(result).toEqual({ alreadyProcessed: false });
    });
  });
});
