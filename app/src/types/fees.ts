import { z } from 'zod';

export const invoiceStatusEnum = z.enum(['Pending', 'Partial', 'Paid']);
export const paymentStatusEnum = z.enum(['Pending', 'Success', 'Failed']);
export const paymentMethodEnum = z.enum(['RAZORPAY', 'CASH', 'UPI', 'CHEQUE', 'BANK_TRANSFER']);

export const feeStructureSchema = z.object({
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

export const paymentSchema = z.object({
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

export const createFeeStructureSchema = z.object({
  sectionId: z.string(),
  academicYearId: z.string(),
  tuitionFee: z.number(),
  examFee: z.number(),
  transportFee: z.number(),
  hostelFee: z.number(),
  otherFee: z.number(),
});

export const generateInvoicesSchema = z.object({
  feeStructureId:z.string(),
  dueDate:z.string(),
  description:z.string().optional(),
})

export const generateInvoicesResultSchema = z.object({
  message: z.string(),
  created: z.number(),
  skipped: z.number(),
})




export const payment_Schema = z.object({
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

  payments: z.array(payment_Schema),
});

export const studentInvoicesSchema = z.array(studentInvoiceSchema);

export const updateFeeStructureSchema = z.object({
  tuitionFee: z.number().optional(),
  examFee: z.number().optional(),
  transportFee: z.number().optional(),
  hostelFee: z.number().optional(),
  otherFee: z.number().optional(),
});

export const personalDetailsSchema = z.object({
  id: z.string(),
  name: z.string(),
  profilePic: z.string(),
  email: z.string(),
});

export const singleInvoiceSchema = z.object({
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
  student: z.object({
    id: z.string(),
    details: personalDetailsSchema.nullable(),
  }),
});

export type createFeeStructureType = z.infer<typeof createFeeStructureSchema>
export type Invoice = z.infer<typeof invoiceSchema>;
export type FeeStructure = z.infer<typeof feeStructureSchema>
export type InvoiceArray = z.infer<typeof invoiceArraySchema>;
export type PaymentOrder = z.infer<typeof paymentOrderSchema>;
export type generateInvoicesType = z.infer<typeof generateInvoicesSchema>;
export type generateInvoicesResultType = z.infer<typeof generateInvoicesResultSchema>;
export type StudentInvoice = z.infer<typeof studentInvoiceSchema>;
export type StudentInvoices = z.infer<typeof studentInvoicesSchema>;
export type UpdateFeeStructureType = z.infer<typeof updateFeeStructureSchema>;
export type SingleInvoice = z.infer<typeof singleInvoiceSchema>;
