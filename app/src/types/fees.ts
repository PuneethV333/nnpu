import { z } from 'zod';

export const invoiceStatusEnum = z.enum(['Pending', 'Partial', 'Paid']);
export const paymentStatusEnum = z.enum(['Pending', 'Success', 'Failed']);
export const paymentMethodEnum = z.enum(['RAZORPAY', 'CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER']);

const feeStructureSchema = z.object({
  id: z.string(),
  sectionId: z.string(),
  academicYearId: z.string(),
  tuitionFee: z.number(),
  examFee: z.number(),
  transportFee: z.number(),
  hostelFee: z.number(),
  otherFee: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const paymentSchema = z.object({
  id: z.string(),
  invoiceId: z.string(),
  studentId: z.string(),
  amount: z.number(),
  method: paymentMethodEnum,
  status: paymentStatusEnum,
  reference: z.string().nullable(),
  razorpayOrderId: z.string().nullable(),
  razorpayPaymentId: z.string().nullable(),
  paidAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const invoiceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  feeStructureId: z.string(),
  totalAmount: z.number(),
  paidAmount: z.number(),
  status: invoiceStatusEnum,
  dueDate: z.coerce.date(),
  description: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  feeStructure: feeStructureSchema,
  payments: z.array(paymentSchema),
});

export const invoiceArraySchema = z.array(invoiceSchema);

export const paymentOrderSchema = z.object({
  orderId: z.string(),
  amount: z.number(),
  currency: z.string(),
  key: z.string(),
});

export type Invoice = z.infer<typeof invoiceSchema>;
export type InvoiceArray = z.infer<typeof invoiceArraySchema>;
export type PaymentOrder = z.infer<typeof paymentOrderSchema>;