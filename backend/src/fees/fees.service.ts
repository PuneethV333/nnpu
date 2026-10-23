import { LoggerService } from '@/logger/logger.service';
import { PrismaService } from '@/prisma/prisma.service';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { UpdateFeeStructureDto } from './dto/update-fee-structure.dto';
import { GenerateInvoicesDto } from './dto/generate-invoices.dto';
import { RazorpayService } from './razorpay.service';
import { Prisma, Role } from '@/generated/prisma';
import { ConfigService } from '@nestjs/config';
import { HandleRazorpayWebhookDto } from './dto/handle-razorpay-webhook.dto';
import { RecordManualPaymentDto } from './dto/record-manual-payment.dto';
import { createHmac, timingSafeEqual } from 'crypto';
import { StudentInvoice, StudentInvoices } from './type/studentInvoice.type';
import { RazorpayWebhookEvent } from './type/razorpay-webhook.type';
import { assertSectionAccess } from '@/common/utils/section-students.util';

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

  async getFeeStructure(
    sectionId: string,
    academicYearId: string,
    authId: string,
  ) {
    this.logger.log('[get-fee-structure]');

    // Previously this method took no `authId` at all, so there was nothing to
    // authorize against and `@Roles('Admin','Teacher')` at the route was the only
    // thing standing between any teacher and any section's fee amounts. Every
    // other teacher-facing endpoint scopes through this same helper.
    await assertSectionAccess(this.prisma, sectionId, authId);

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
      // One INSERT for the whole section instead of N statements inside a batch
      // transaction. Both are all-or-nothing, but the per-row form holds N round
      // trips open inside a single request — on a cold pool against a 100-student
      // section that is what surfaced as a 500, and it is why the client now
      // waits five minutes instead of fifteen seconds.
      await this.prisma.invoice.createMany({
        data: toInvoice.map((student) => ({
          studentId: student.id,
          feeStructureId: dto.feeStructureId,
          totalAmount,
          dueDate: new Date(dto.dueDate),
          description: dto.description,
        })),
      });
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

  async getInvoicesForStudent(studentId: string): Promise<StudentInvoices> {
    const invoices = await this.prisma.invoice.findMany({
      where: { studentId },
      include: {
        feeStructure: true,
        payments: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return invoices.map((invoice): StudentInvoice => ({
      id: invoice.id,
      dueDate: invoice.dueDate,
      status: invoice.status,

      totalAmount: invoice.totalAmount,
      paidAmount: invoice.paidAmount,
      balanceAmount: invoice.totalAmount - invoice.paidAmount,

      description: invoice.description,

      feeBreakdown: {
        tuition: invoice.feeStructure.tuitionFee,
        exam: invoice.feeStructure.examFee,
        transport: invoice.feeStructure.transportFee,
        hostel: invoice.feeStructure.hostelFee,
        other: invoice.feeStructure.otherFee,
      },

      payments: invoice.payments.map((payment) => ({
        id: payment.id,
        amount: payment.amount,
        refundAmount: payment.refundAmount,
        method: payment.method,
        status: payment.status,
        reference: payment.reference,
        paidAt: payment.paidAt,
      })),
    }));
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
    const razorpayKey = this.config.get<string>('RAZORPAY_KEY_ID');

    if (!razorpayKey) {
      throw new ServiceUnavailableException(
        'Razorpay is not configured on this server',
      );
    }

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

    type OrderPlan =
      | { kind: 'reuse'; orderId: string; amount: number }
      | { kind: 'create'; paymentId: string; amount: number };

    let orderPlan: OrderPlan;
    try {
      orderPlan = await this.prisma.$transaction(async (tx) => {
        const invoiceRows = await tx.$queryRaw<
          Array<{
            id: string;
            studentId: string;
            totalAmount: number;
            paidAmount: number;
          }>
        >`
          SELECT "id", "studentId", "totalAmount", "paidAmount"
          FROM "Invoice"
          WHERE "id" = ${invoiceId}
          FOR UPDATE
        `;
        const currentInvoice = invoiceRows[0];

        if (!currentInvoice) {
          throw new NotFoundException('invoice not found');
        }

        if (currentInvoice.studentId !== userId && role !== 'Admin') {
          throw new ForbiddenException('Cannot pay for another student');
        }

        const pendingAmount =
          currentInvoice.totalAmount - currentInvoice.paidAmount;
        if (pendingAmount <= 0) {
          throw new BadRequestException('Invoice is already fully paid');
        }

        const openPayment = await tx.payment.findFirst({
          where: { invoiceId, status: 'Pending' },
          orderBy: { createdAt: 'desc' },
        });

        if (openPayment) {
          if (openPayment.amount !== pendingAmount) {
            throw new ConflictException(
              'An open payment order has a different balance. Contact an administrator before retrying.',
            );
          }

          if (
            openPayment.method !== 'RAZORPAY' ||
            !openPayment.razorpayOrderId
          ) {
            throw new ConflictException(
              'A payment order is being prepared. Retry shortly, or contact an administrator if it remains unavailable.',
            );
          }

          this.logger.log(
            `[payment-order] reusing open order ${openPayment.razorpayOrderId} for invoice ${invoiceId}`,
          );
          return {
            kind: 'reuse',
            orderId: openPayment.razorpayOrderId,
            amount: openPayment.amount,
          } as const;
        }

        // Older deployments marked payment attempts Failed and then issued a
        // second order. Those Razorpay orders are still retryable, so revive the
        // latest matching order instead of creating another payable order.
        const retryablePayment = await tx.payment.findFirst({
          where: {
            invoiceId,
            method: 'RAZORPAY',
            status: 'Failed',
            razorpayOrderId: { not: null },
          },
          orderBy: { createdAt: 'desc' },
        });

        if (retryablePayment) {
          if (retryablePayment.amount !== pendingAmount) {
            throw new ConflictException(
              'A previous Razorpay order is still open for a different balance. Contact an administrator before retrying.',
            );
          }

          const reactivated = await tx.payment.updateMany({
            where: { id: retryablePayment.id, status: 'Failed' },
            data: { status: 'Pending' },
          });

          if (reactivated.count === 1) {
            return {
              kind: 'reuse',
              orderId: retryablePayment.razorpayOrderId as string,
              amount: retryablePayment.amount,
            } as const;
          }

          const concurrentlyOpenedPayment = await tx.payment.findFirst({
            where: { invoiceId, status: 'Pending' },
            orderBy: { createdAt: 'desc' },
          });

          if (
            concurrentlyOpenedPayment?.method === 'RAZORPAY' &&
            concurrentlyOpenedPayment.razorpayOrderId &&
            concurrentlyOpenedPayment.amount === pendingAmount
          ) {
            return {
              kind: 'reuse',
              orderId: concurrentlyOpenedPayment.razorpayOrderId,
              amount: concurrentlyOpenedPayment.amount,
            } as const;
          }

          throw new ConflictException(
            'A payment order is being prepared. Retry shortly.',
          );
        }

        // Reserve the invoice's unique Pending slot before contacting Razorpay.
        // The invoice row lock serializes concurrent requests, preventing two
        // provider orders from being minted by simultaneous button clicks.
        const reservation = await tx.payment.create({
          data: {
            invoiceId,
            method: 'RAZORPAY',
            studentId: currentInvoice.studentId,
            amount: pendingAmount,
            status: 'Pending',
          },
        });

        return {
          kind: 'create',
          paymentId: reservation.id,
          amount: pendingAmount,
        } as const;
      });
    } catch (error) {
      if ((error as { code?: string })?.code === 'P2002') {
        throw new ConflictException(
          'Another payment order is being created for this invoice. Retry shortly.',
        );
      }
      throw error;
    }

    if (orderPlan.kind === 'reuse') {
      return {
        orderId: orderPlan.orderId,
        amount: orderPlan.amount,
        currency: 'INR',
        key: razorpayKey,
      };
    }

    let order: Awaited<ReturnType<RazorpayService['createOrder']>>;
    try {
      order = await this.razorpay.createOrder(
        orderPlan.amount,
        `inv_${invoiceId}`,
      );
    } catch (error) {
      const statusCode = (error as { statusCode?: number })?.statusCode;
      if (
        typeof statusCode === 'number' &&
        statusCode >= 400 &&
        statusCode < 500
      ) {
        await this.prisma.payment.updateMany({
          where: {
            id: orderPlan.paymentId,
            status: 'Pending',
            razorpayOrderId: null,
          },
          data: { status: 'Failed' },
        });
      } else {
        this.logger.error(
          `[payment-order] Razorpay order creation outcome is uncertain for invoice ${invoiceId}; keeping the reservation open`,
        );
      }
      throw error;
    }

    const linkedOrder = await this.prisma.payment.updateMany({
      where: {
        id: orderPlan.paymentId,
        status: 'Pending',
        razorpayOrderId: null,
      },
      data: { razorpayOrderId: order.id },
    });

    if (linkedOrder.count !== 1) {
      this.logger.error(
        `[payment-order] created Razorpay order ${order.id} but could not link it to invoice ${invoiceId}`,
      );
      throw new ServiceUnavailableException(
        'The payment order could not be saved. Contact an administrator before retrying.',
      );
    }

    return {
      orderId: order.id,
      amount: orderPlan.amount,
      currency: 'INR',
      key: razorpayKey,
    };
  }

  /**
   * Records money collected outside Razorpay — cash at the counter, a UPI
   * transfer, a cheque — and credits the invoice in the same transaction.
   *
   * The `Payment` row is written here rather than in the app so the invoice and
   * its payment history can never disagree, and so a cash receipt shows up in
   * the same list as an online one. `amount` defaults to the outstanding balance
   * because that is what the counter collects in the normal case; a partial
   * amount is allowed for part payments.
   */
  async recordManualPayment(invoiceId: string, dto: RecordManualPaymentDto) {
    return this.prisma.$transaction(async (tx) => {
      const invoiceRows = await tx.$queryRaw<
        Array<{
          id: string;
          studentId: string;
          totalAmount: number;
          paidAmount: number;
        }>
      >`
        SELECT "id", "studentId", "totalAmount", "paidAmount"
        FROM "Invoice"
        WHERE "id" = ${invoiceId}
        FOR UPDATE
      `;
      const invoice = invoiceRows[0];
      if (!invoice) {
        throw new NotFoundException('invoice not found');
      }

      const balance = invoice.totalAmount - invoice.paidAmount;
      if (balance <= 0) {
        throw new ConflictException('Invoice is already fully paid');
      }

      const amount = dto.amount ?? balance;
      if (amount > balance) {
        // Unlike a captured Razorpay payment, which has already happened and can
        // only be refunded, this is entered by hand: refuse it and let the clerk
        // correct the figure instead of recording money the school must hand back.
        throw new BadRequestException(
          `Amount is more than the outstanding balance (${balance} paise)`,
        );
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: invoice.id,
          studentId: invoice.studentId,
          amount,
          method: dto.method,
          status: 'Success',
          reference: dto.reference?.trim() || null,
          paidAt: new Date(),
        },
        select: { id: true },
      });

      await this.creditInvoice(tx, invoice.id, amount);

      return {
        paymentId: payment.id,
        invoiceId: invoice.id,
        method: dto.method,
        amount,
        totalAmount: invoice.totalAmount,
        paidAmount: invoice.paidAmount + amount,
        balanceAmount: balance - amount,
      };
    });
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

    const providerPayment =
      await this.razorpay.fetchPayment(razorpay_payment_id);
    const capturedAmount = Number(providerPayment.amount);

    if (
      providerPayment.order_id !== razorpay_order_id ||
      providerPayment.currency !== 'INR' ||
      !Number.isSafeInteger(capturedAmount) ||
      capturedAmount <= 0
    ) {
      throw new BadRequestException(
        'Razorpay payment details do not match the payment order',
      );
    }

    const settledAmount = await this.ensureCaptured(
      razorpay_payment_id,
      providerPayment.status,
      capturedAmount,
    );

    const result = await this.confirmPayment(
      razorpay_order_id,
      {
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
      settledAmount,
    );

    if (result.alreadyProcessed) {
      this.logger.log(
        `Payment ${razorpay_payment_id} already processed — skipping`,
      );
      return {
        alreadyProcessed: true,
        refundRequired: result.refundAmount > 0,
        refundAmount: result.refundAmount,
      };
    }

    if (result.refundAmount > 0) {
      this.logger.warn(
        `[payment] captured payment ${razorpay_payment_id} exceeds invoice ${result.invoiceId} balance by ${result.refundAmount} paise; refund required`,
      );
      return {
        alreadyProcessed: false,
        refundRequired: true,
        refundAmount: result.refundAmount,
      };
    }

    this.logger.log(
      `Payment successful: ${razorpay_payment_id} for invoice ${result.invoiceId}`,
    );
    return {
      alreadyProcessed: false,
      refundRequired: false,
      refundAmount: 0,
    };
  }

  /**
   * Returns the amount that is actually captured, capturing it first if Razorpay
   * only authorised it.
   *
   * Razorpay's automatic capture is asynchronous and conditional on the
   * account's capture setting. In test mode it is effectively instant, so this
   * path never runs in a test-mode walkthrough — but on the first real payment a
   * just-completed checkout is routinely still `authorized`, and the old code
   * threw 409 "not captured yet" at that point. The student's money is already
   * gone by then, the invoice is not, and nothing retries. Capturing here makes
   * the settle step independent of the dashboard setting.
   */
  private async ensureCaptured(
    razorpayPaymentId: string,
    status: string | undefined,
    authorizedAmount: number,
  ): Promise<number> {
    if (status === 'captured') {
      return authorizedAmount;
    }

    if (status !== 'authorized') {
      throw new ConflictException(
        `Razorpay payment is ${status ?? 'in an unknown state'}, not captured`,
      );
    }

    let capturedAmount: number;
    try {
      const captured = await this.razorpay.capturePayment(
        razorpayPaymentId,
        authorizedAmount,
      );
      capturedAmount = Number(captured.amount);
      this.logger.warn(
        `[payment] captured ${razorpayPaymentId} explicitly — auto-capture had not run`,
      );
    } catch (error) {
      this.logger.error(
        `[payment] capture failed for ${razorpayPaymentId}: ${
          (error as { error?: { description?: string } })?.error?.description ??
          (error as Error)?.message ??
          'unknown error'
        }`,
      );

      // Razorpay's own capture can win the race between the read above and this
      // call, and capturing an already-captured payment is an error there — the
      // same "already captured" the caller would otherwise be told about a
      // payment that did in fact succeed. Re-read before declaring failure.
      const settledAmount = await this.readCapturedAmount(razorpayPaymentId);
      if (settledAmount !== null) {
        this.logger.warn(
          `[payment] ${razorpayPaymentId} was captured concurrently — using the settled amount`,
        );
        return settledAmount;
      }

      throw new ConflictException(
        'Razorpay could not capture this payment. If the amount left the account, contact the office — the invoice is still unpaid.',
      );
    }

    if (!Number.isSafeInteger(capturedAmount) || capturedAmount <= 0) {
      throw new ConflictException(
        'Razorpay returned an unusable captured amount',
      );
    }

    return capturedAmount;
  }

  /** The amount, if Razorpay reports this payment as captured right now. */
  private async readCapturedAmount(
    razorpayPaymentId: string,
  ): Promise<number | null> {
    try {
      const payment = await this.razorpay.fetchPayment(razorpayPaymentId);
      const amount = Number(payment.amount);
      return payment.status === 'captured' &&
        Number.isSafeInteger(amount) &&
        amount > 0
        ? amount
        : null;
    } catch {
      // The re-read is a second opinion, not a requirement: if it also fails,
      // the original capture error is the one worth reporting.
      return null;
    }
  }

  /**
   * Locks the invoice before claiming the captured payment so different orders
   * for the same invoice settle serially. Any amount above the remaining balance
   * is recorded as requiring a refund rather than over-crediting the invoice.
   */
  private async confirmPayment(
    razorpayOrderId: string,
    providerFields: { razorpayPaymentId: string; razorpaySignature?: string },
    capturedAmount: number,
  ): Promise<{
    alreadyProcessed: boolean;
    invoiceId: string;
    refundAmount: number;
  }> {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({
        where: { razorpayOrderId },
      });
      if (!payment) throw new NotFoundException('Payment record not found');
      if (payment.method !== 'RAZORPAY') {
        throw new ConflictException('Payment order is not a Razorpay payment');
      }

      const invoiceRows = await tx.$queryRaw<
        Array<{ id: string; totalAmount: number; paidAmount: number }>
      >`
        SELECT "id", "totalAmount", "paidAmount"
        FROM "Invoice"
        WHERE "id" = ${payment.invoiceId}
        FOR UPDATE
      `;
      const invoice = invoiceRows[0];
      if (!invoice) throw new NotFoundException('Invoice not found');

      if (payment.status === 'Success' || payment.status === 'RefundRequired') {
        return {
          alreadyProcessed: true,
          invoiceId: payment.invoiceId,
          refundAmount: payment.refundAmount,
        };
      }

      const claim = await tx.payment.updateMany({
        where: { id: payment.id, status: { in: ['Pending', 'Failed'] } },
        data: {
          ...providerFields,
          amount: capturedAmount,
          refundAmount: 0,
          status: 'Success',
          paidAt: new Date(),
        },
      });

      if (claim.count === 0) {
        const currentPayment = await tx.payment.findUnique({
          where: { id: payment.id },
          select: { refundAmount: true },
        });
        return {
          alreadyProcessed: true,
          invoiceId: payment.invoiceId,
          refundAmount: currentPayment?.refundAmount ?? 0,
        };
      }

      const amountToApply = Math.min(
        capturedAmount,
        Math.max(invoice.totalAmount - invoice.paidAmount, 0),
      );
      const refundAmount = capturedAmount - amountToApply;

      await this.creditInvoice(tx, invoice.id, amountToApply);

      if (refundAmount > 0) {
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'RefundRequired', refundAmount },
        });
      }

      return {
        alreadyProcessed: false,
        invoiceId: payment.invoiceId,
        refundAmount,
      };
    });
  }

  /**
   * Credits an invoice by `amount` in paise and derives its status from the new
   * balance, in one statement so two concurrent settles cannot both read the old
   * `paidAmount`. Shared by the Razorpay settle path and manual entry — the two
   * differ only in where the money came from, not in how the invoice moves.
   */
  private async creditInvoice(
    tx: Prisma.TransactionClient,
    invoiceId: string,
    amount: number,
  ): Promise<void> {
    const updated = await tx.$executeRaw`
      UPDATE "Invoice"
      SET "paidAmount" = LEAST("totalAmount", "paidAmount" + ${amount}),
          "status" = CASE
            WHEN LEAST("totalAmount", "paidAmount" + ${amount}) >= "totalAmount"
            THEN 'Paid'::"InvoiceStatus"
            WHEN "paidAmount" + ${amount} > 0
            THEN 'Partial'::"InvoiceStatus"
            ELSE 'Pending'::"InvoiceStatus"
          END,
          "updatedAt" = NOW()
      WHERE "id" = ${invoiceId}
    `;

    if (updated === 0) {
      throw new NotFoundException('Invoice not found');
    }
  }

  async handleWebhookEvent(rawBody: Buffer, signature: string) {
    this.logger.log('[razorpay-webhook] received');

    const webhookSecret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET');

    // Optional in Joi (so boot does not fail without it) but unusable here.
    // Previously it was asserted with `!` and fed straight into createHmac,
    // which threw a TypeError and surfaced as an opaque 500 on every delivery.
    if (!webhookSecret) {
      this.logger.error(
        '[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET is not configured',
      );
      throw new ServiceUnavailableException(
        'Razorpay webhook is not configured on this server',
      );
    }

    const expectedSignature = createHmac('sha256', webhookSecret)
      .update(rawBody)
      .digest();
    const providedSignature =
      typeof signature === 'string' && /^[a-f0-9]{64}$/i.test(signature)
        ? Buffer.from(signature, 'hex')
        : Buffer.alloc(0);

    if (
      expectedSignature.length !== providedSignature.length ||
      !timingSafeEqual(expectedSignature, providedSignature)
    ) {
      this.logger.error('[razorpay-webhook] invalid signature');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString('utf8')) as RazorpayWebhookEvent;

    // A failed event describes one payment attempt, not the order. Razorpay
    // keeps the order available for another attempt, so leave its local slot
    // Pending and reuse that same order on retry.
    if (event.event === 'payment.failed') {
      const failedOrderId = event.payload?.payment?.entity?.order_id;
      if (failedOrderId) {
        this.logger.warn(
          `[razorpay-webhook] payment attempt failed for order ${failedOrderId}; keeping the order open for retry`,
        );
      }
      return { received: true };
    }

    // `payment.authorized` is what a manual-capture account sends instead of
    // `payment.captured`. Ignoring it left the money merely held: nothing else
    // captures, so the authorisation expires and the invoice never settles —
    // and this is the only event that arrives when the app is killed after
    // checkout. Treat it as "capture, then settle".
    const isAuthorizedEvent = event.event === 'payment.authorized';

    if (event.event !== 'payment.captured' && !isAuthorizedEvent) {
      this.logger.log(`[razorpay-webhook] ignoring event type: ${event.event}`);
      return { received: true };
    }

    const paymentEntity = event.payload?.payment?.entity;
    const orderId = paymentEntity?.order_id;
    const paymentId = paymentEntity?.id;
    const authorizedAmount = paymentEntity?.amount;

    if (
      !orderId ||
      !paymentId ||
      typeof authorizedAmount !== 'number' ||
      !Number.isSafeInteger(authorizedAmount) ||
      authorizedAmount <= 0 ||
      paymentEntity?.currency !== 'INR'
    ) {
      this.logger.error(
        '[razorpay-webhook] malformed captured payment payload',
      );
      throw new BadRequestException('Malformed Razorpay payment event');
    }

    // Throws on failure, which answers non-2xx on purpose: Razorpay retries a
    // failed delivery, and a capture that timed out is worth retrying. Swallow
    // it and the payment is lost with the invoice still unpaid.
    const capturedAmount = isAuthorizedEvent
      ? await this.ensureCaptured(paymentId, 'authorized', authorizedAmount)
      : authorizedAmount;

    let result: {
      alreadyProcessed: boolean;
      invoiceId: string;
      refundAmount: number;
    };
    try {
      result = await this.confirmPayment(
        orderId,
        { razorpayPaymentId: paymentId },
        capturedAmount,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        this.logger.error(
          `[razorpay-webhook] no payment record for order ${orderId}`,
        );
        return { received: true };
      }
      throw error;
    }

    if (result.alreadyProcessed) {
      this.logger.log(
        `[razorpay-webhook] payment ${paymentId} already processed — skipping`,
      );
      return { received: true };
    }

    if (result.refundAmount > 0) {
      this.logger.error(
        `[razorpay-webhook] captured payment ${paymentId} exceeds invoice ${result.invoiceId} balance by ${result.refundAmount} paise; refund required`,
      );
      return { received: true };
    }

    this.logger.log(
      `[razorpay-webhook] payment confirmed: ${paymentId} for invoice ${result.invoiceId}`,
    );

    return { received: true };
  }
}
