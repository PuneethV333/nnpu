import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RazorpayService } from './razorpay.service';
import { Role } from '@/generated/prisma/enums';
import { ConfigService } from '@nestjs/config';
import { HandleRazorpayWebhookDto } from './dto/handle-razorpay-webhook.dto';

@Injectable()
export class FeesService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
    private readonly razorpay: RazorpayService,
    private readonly prisma: PrismaService,
  ) {}

  private async resolveUser(
    authId: string,
  ): Promise<{ userId: string; role: Role }> {
    const auth = await this.prisma.auth.findUnique({
      where: { authId },
      select: { userId: true, user: { select: { role: true } } },
    });

    if (!auth) {
      throw new UnauthorizedException('user not found');
    }

    return { userId: auth.userId, role: auth.user.role };
  }

  async createFeeStructure(dto: CreateFeeStructureDto) {
    this.logger.log('[create-fee-structure]');

    const existing = await this.prisma.feeStructure.findUnique({
      where: {
        sectionId_academicYearId: {
          sectionId: dto.sectionId,
          academicYearId: dto.academicYearId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(
        'A fee structure already exists for this section and academic year',
      );
    }

    return this.prisma.feeStructure.create({
      data: {
        sectionId: dto.sectionId,
        academicYearId: dto.academicYearId,
        tuitionFee: dto.tuitionFee,
        examFee: dto.examFee ?? 0,
        transportFee: dto.transportFee ?? 0,
        hostelFee: dto.hostelFee ?? 0,
        otherFee: dto.otherFee ?? 0,
      },
    });
  }

  async getFeeStructure(sectionId: string, academicYearId: string) {
    this.logger.log('[get-fee-structure]');

    const feeStructure = await this.prisma.feeStructure.findUnique({
      where: {
        sectionId_academicYearId: { sectionId, academicYearId },
      },
    });

    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found');
    }

    return feeStructure;
  }

  async updateFeeStructure(id: string, dto: UpdateFeeStructureDto) {
    this.logger.log('[update-fee-structure]');

    const feeStructure = await this.prisma.feeStructure.findUnique({
      where: { id },
    });

    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found');
    }

    const invoiceCount = await this.prisma.invoice.count({
      where: { feeStructureId: id },
    });

    if (invoiceCount > 0) {
      throw new BadRequestException(
        'Cannot modify a fee structure that already has invoices generated against it — create a new fee structure instead',
      );
    }

    return this.prisma.feeStructure.update({
      where: { id },
      data: dto,
    });
  }

  async generateInvoices(dto: GenerateInvoicesDto) {
    this.logger.log('[generate-invoices]');

    const feeStructure = await this.prisma.feeStructure.findUnique({
      where: { id: dto.feeStructureId },
    });

    if (!feeStructure) {
      throw new NotFoundException('Fee structure not found');
    }

    const totalAmount =
      feeStructure.tuitionFee +
      feeStructure.examFee +
      feeStructure.transportFee +
      feeStructure.hostelFee +
      feeStructure.otherFee;

    const students = await this.prisma.user.findMany({
      where: {
        sectionId: feeStructure.sectionId,
        role: 'Student',
        isActive: true,
      },
      select: { id: true },
    });

    if (students.length === 0) {
      throw new BadRequestException('No active students found in this section');
    }

    const alreadyInvoiced = await this.prisma.invoice.findMany({
      where: {
        feeStructureId: dto.feeStructureId,
        studentId: { in: students.map((s) => s.id) },
      },
      select: { studentId: true },
    });
    const alreadyInvoicedIds = new Set(alreadyInvoiced.map((i) => i.studentId));

    const toInvoice = students.filter((s) => !alreadyInvoicedIds.has(s.id));

    if (toInvoice.length === 0) {
      return {
        message:
          'All students in this section already have an invoice for this fee structure',
        created: 0,
        skipped: students.length,
      };
    }

    try {
      await this.prisma.$transaction(
        toInvoice.map((student) =>
          this.prisma.invoice.create({
            data: {
              studentId: student.id,
              feeStructureId: dto.feeStructureId,
              totalAmount,
              dueDate: new Date(dto.dueDate),
              description: dto.description,
            },
          }),
        ),
      );
    } catch (err) {
      if ((err as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'one or more students were invoiced concurrently - please retry',
        );
      }
      throw err;
    }

    return {
      message: `Invoices generated for ${toInvoice.length} students`,
      created: toInvoice.length,
      skipped: alreadyInvoicedIds.size,
    };
  }

  async getInvoicesForStudent(studentId: string) {
    this.logger.log('[get-invoices-for-student]');
    return this.prisma.invoice.findMany({
      where: { studentId },
      include: { feeStructure: true, payments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getInvoicesForStudentByAuth(authId: string) {
    const { userId } = await this.resolveUser(authId);
    return this.getInvoicesForStudent(userId);
  }

  async getInvoice(id: string, authId: string) {
    this.logger.log('[get-invoice]');
    const { userId, role } = await this.resolveUser(authId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        feeStructure: true,
        payments: true,
        student: { select: { id: true, details: true } },
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    const isSelf = invoice.studentId === userId;
    const isAdmin = role === 'Admin';

    if (!isSelf && !isAdmin) {
      throw new ForbiddenException('You are not allowed to view this invoice');
    }

    return invoice;
  }

  async createPaymentOrder(invoiceId: string, authId: string) {
    const { userId, role } = await this.resolveUser(authId);

    const invoice = await this.prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: { student: true },
    });

    if (!invoice) {
      throw new NotFoundException('invoice not found');
    }

    const isSelf = invoice.studentId === userId;
    if (!isSelf && role !== 'Admin') {
      throw new ForbiddenException('Cannot pay for another student');
    }

    const pendingAmount = invoice.totalAmount - invoice.paidAmount;
    if (pendingAmount <= 0) {
      throw new BadRequestException('Invoice is already fully paid');
    }

    const order = await this.razorpay.createOrder(
      pendingAmount,
      `inv_${invoiceId}`,
    );

    await this.prisma.payment.create({
      data: {
        invoiceId,
        method: 'RAZORPAY',
        studentId: invoice.studentId,
        amount: pendingAmount,
        razorpayOrderId: order.id,
        status: 'Pending',
      },
    });

    return {
      orderId: order.id,
      amount: pendingAmount,
      currency: 'INR',
      key: this.config.get<string>('RAZORPAY_KEY_ID'),
    };
  }

  async verifyPayment(payload: HandleRazorpayWebhookDto) {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      payload;

    const isValid = this.razorpay.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
    );
    if (!isValid) {
      this.logger.error('Razorpay signature verification failed');
      throw new BadRequestException('Invalid signature');
    }

    const payment = await this.prisma.payment.findFirst({
      where: { razorpayOrderId: razorpay_order_id },
      include: { invoice: true },
    });
    if (!payment) throw new NotFoundException('Payment record not found');

    const claim = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: { not: 'Success' } },
      data: {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        status: 'Success',
        paidAt: new Date(),
      },
    });

    if (claim.count === 0) {
      this.logger.log(
        `Payment ${razorpay_payment_id} already processed — skipping`,
      );
      return { alreadyProcessed: true };
    }

    const newPaidAmount = payment.invoice.paidAmount + payment.amount;
    const newStatus =
      newPaidAmount >= payment.invoice.totalAmount ? 'Paid' : 'Partial';

    await this.prisma.invoice.update({
      where: { id: payment.invoiceId },
      data: { paidAmount: { increment: payment.amount }, status: newStatus },
    });

    this.logger.log(
      `Payment successful: ${razorpay_payment_id} for invoice ${payment.invoiceId}`,
    );
    return { alreadyProcessed: false };
  }
}
