import { z } from 'zod';

export const paymentMethodEnum = z.enum([
  'RAZORPAY',
  'CASH',
  'UPI',
  'CHEQUE',
  'BANK_TRANSFER',
]);

export const paymentStatusEnum = z.enum(['Pending', 'Success', 'Failed']);

export const invoiceStatusEnum = z.enum(['Pending', 'Partial', 'Paid']);

export const paymentSchema = z.object({
  id: z.string(),
  amount: z.number(),
  method: paymentMethodEnum,
  status: paymentStatusEnum,
  reference: z.string().nullable(),
  paidAt: z.date().nullable(),
});

export const feeBreakdownSchema = z.object({
  tuition: z.number(),
  exam: z.number(),
  transport: z.number(),
  hostel: z.number(),
  other: z.number(),
});

export const studentInvoiceSchema = z.object({
  id: z.string(),
  dueDate: z.date(),
  status: invoiceStatusEnum,

  totalAmount: z.number(),
  paidAmount: z.number(),
  balanceAmount: z.number(),

  description: z.string().nullable(),

  feeBreakdown: feeBreakdownSchema,

  payments: z.array(paymentSchema),
});

export const studentInvoicesSchema = z.array(studentInvoiceSchema);

export type StudentInvoice = z.infer<typeof studentInvoiceSchema>;
export type StudentInvoices = z.infer<typeof studentInvoicesSchema>;
