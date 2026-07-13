/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
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
      updateMany: jest.fn(),
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
      ).rejects.toThrow(ConflictException);
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

  describe('getFeeStructure', () => {
    it('throws NotFoundException if none exists', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(null);

      await expect(service.getFeeStructure('sec-1', 'ay-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the fee structure when found', async () => {
      const fs = { id: 'fs-1', tuitionFee: 5000000 };
      mockPrisma.feeStructure.findUnique.mockResolvedValue(fs);

      const result = await service.getFeeStructure('sec-1', 'ay-1');

      expect(result).toEqual(fs);
    });
  });

  describe('updateFeeStructure', () => {
    it('throws NotFoundException if the structure does not exist', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(null);

      await expect(
        service.updateFeeStructure('fs-1', {} as any),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if invoices already exist against it', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue({ id: 'fs-1' });
      mockPrisma.invoice.count.mockResolvedValue(3);

      await expect(
        service.updateFeeStructure('fs-1', {} as any),
      ).rejects.toThrow(BadRequestException);
    });

    it('updates the structure when no invoices exist yet', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue({ id: 'fs-1' });
      mockPrisma.invoice.count.mockResolvedValue(0);
      mockPrisma.feeStructure.update.mockResolvedValue({
        id: 'fs-1',
        tuitionFee: 6000000,
      });

      const result = await service.updateFeeStructure('fs-1', {
        tuitionFee: 6000000,
      } as any);

      expect(result).toEqual({ id: 'fs-1', tuitionFee: 6000000 });
    });
  });

  describe('generateInvoices', () => {
    const dto = {
      feeStructureId: 'fs-1',
      dueDate: '2026-08-15',
      description: 'Term 1 fees',
    };
    const feeStructure = {
      id: 'fs-1',
      sectionId: 'sec-1',
      tuitionFee: 5000000,
      examFee: 200000,
      transportFee: 0,
      hostelFee: 0,
      otherFee: 0,
    };

    it('throws NotFoundException if fee structure does not exist', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(null);

      await expect(service.generateInvoices(dto as any)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException if no active students exist in the section', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(feeStructure);
      mockPrisma.user.findMany.mockResolvedValue([]);

      await expect(service.generateInvoices(dto as any)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('skips students who already have an invoice, creates for the rest', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(feeStructure);
      mockPrisma.user.findMany.mockResolvedValue([
        { id: 'st-1' },
        { id: 'st-2' },
      ]);
      mockPrisma.invoice.findMany.mockResolvedValue([{ studentId: 'st-1' }]);
      mockPrisma.$transaction.mockResolvedValue([{}]);

      const result = await service.generateInvoices(dto as any);

      expect(result).toEqual({
        message: 'Invoices generated for 1 students',
        created: 1,
        skipped: 1,
      });
    });

    it('returns early with created:0 if every student is already invoiced', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(feeStructure);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'st-1' }]);
      mockPrisma.invoice.findMany.mockResolvedValue([{ studentId: 'st-1' }]);

      const result = await service.generateInvoices(dto as any);

      expect(result.created).toBe(0);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('throws ConflictException on a concurrent P2002 during invoice creation', async () => {
      mockPrisma.feeStructure.findUnique.mockResolvedValue(feeStructure);
      mockPrisma.user.findMany.mockResolvedValue([{ id: 'st-1' }]);
      mockPrisma.invoice.findMany.mockResolvedValue([]);
      mockPrisma.$transaction.mockRejectedValue({ code: 'P2002' });

      await expect(service.generateInvoices(dto as any)).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('getInvoice', () => {
    const mockInvoice = {
      id: 'inv-1',
      studentId: 'student-1',
      feeStructure: {},
      payments: [],
      student: { id: 'student-1', details: {} },
    };

    it('throws UnauthorizedException if auth not found', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue(null);

      await expect(service.getInvoice('inv-1', 'missing')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws NotFoundException if invoice does not exist', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'student-1',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(null);

      await expect(service.getInvoice('inv-1', 'auth-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws ForbiddenException if a different student tries to view it', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'other-student',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(service.getInvoice('inv-1', 'auth-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('allows the owning student to view it', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'student-1',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-1', 'auth-1');

      expect(result).toEqual(mockInvoice);
    });

    it('allows Admin to view any invoice', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'admin-1',
        user: { role: 'Admin' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      const result = await service.getInvoice('inv-1', 'auth-1');

      expect(result).toEqual(mockInvoice);
    });
  });

  describe('createPaymentOrder', () => {
    const mockInvoice = {
      id: 'inv-1',
      studentId: 'student-1',
      totalAmount: 100,
      paidAmount: 0,
      student: {},
    };

    it('throws ForbiddenException if a different student tries to pay', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'other-student',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);

      await expect(
        service.createPaymentOrder('inv-1', 'auth-1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if invoice is already fully paid', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'student-1',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue({
        ...mockInvoice,
        paidAmount: 100,
      });

      await expect(
        service.createPaymentOrder('inv-1', 'auth-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('creates a Razorpay order and a Pending payment record for the pending amount', async () => {
      mockPrisma.auth.findUnique.mockResolvedValue({
        userId: 'student-1',
        user: { role: 'Student' },
      });
      mockPrisma.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockRazorpay.createOrder.mockResolvedValue({ id: 'order_123' });
      mockPrisma.payment.create.mockResolvedValue({});
      mockConfig.get.mockReturnValue('rzp_key_id');

      const result = await service.createPaymentOrder('inv-1', 'auth-1');

      expect(mockRazorpay.createOrder).toHaveBeenCalledWith(100, 'inv_inv-1');
      expect(mockPrisma.payment.create).toHaveBeenCalledWith({
        data: {
          invoiceId: 'inv-1',
          method: 'RAZORPAY',
          studentId: 'student-1',
          amount: 100,
          razorpayOrderId: 'order_123',
          status: 'Pending',
        },
      });
      expect(result).toEqual({
        orderId: 'order_123',
        amount: 100,
        currency: 'INR',
        key: 'rzp_key_id',
      });
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
        BadRequestException,
      );
      expect(mockPrisma.payment.findFirst).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if no payment record matches the order id', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue(null);

      await expect(service.verifyPayment(payload)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('is idempotent: a concurrent/duplicate call gets alreadyProcessed:true via the atomic updateMany guard', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        amount: 100,
        invoiceId: 'inv-1',
        invoice: { paidAmount: 100, totalAmount: 100 },
      });
      // simulates: another request already flipped status to Success first
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 0 });

      const result = await service.verifyPayment(payload);

      expect(mockPrisma.payment.updateMany).toHaveBeenCalledWith({
        where: { id: 'p-1', status: { not: 'Success' } },
        data: expect.objectContaining({ status: 'Success' }),
      });
      expect(result).toEqual({ alreadyProcessed: true });
      expect(mockPrisma.invoice.update).not.toHaveBeenCalled();
    });

    it('marks the invoice Paid when the increment covers the total amount', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        amount: 100,
        invoiceId: 'inv-1',
        invoice: { paidAmount: 0, totalAmount: 100 },
      });
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.invoice.update.mockResolvedValue({});

      const result = await service.verifyPayment(payload);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paidAmount: { increment: 100 }, status: 'Paid' },
      });
      expect(result).toEqual({ alreadyProcessed: false });
    });

    it('marks the invoice Partial when the increment does not cover the total amount', async () => {
      mockRazorpay.verifyPaymentSignature.mockReturnValue(true);
      mockPrisma.payment.findFirst.mockResolvedValue({
        id: 'p-1',
        amount: 40,
        invoiceId: 'inv-1',
        invoice: { paidAmount: 0, totalAmount: 100 },
      });
      mockPrisma.payment.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.invoice.update.mockResolvedValue({});

      const result = await service.verifyPayment(payload);

      expect(mockPrisma.invoice.update).toHaveBeenCalledWith({
        where: { id: 'inv-1' },
        data: { paidAmount: { increment: 40 }, status: 'Partial' },
      });
      expect(result).toEqual({ alreadyProcessed: false });
    });
  });
});
