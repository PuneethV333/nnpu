import {
  paymentOrderSchema,
  PaymentOrder,
  createFeeStructureType,
  FeeStructure,
  feeStructureSchema,
  generateInvoicesType,
  generateInvoicesResultType,
  generateInvoicesResultSchema,
  StudentInvoices,
  studentInvoicesSchema,
  UpdateFeeStructureType,
  SingleInvoice,
  singleInvoiceSchema,
} from '@/src/types/fees';
import { api } from './client';
import { INVOICE_GENERATION_TIMEOUT_MS } from './timeouts';
import { z } from 'zod';

export const createFeeStructure = async (body:createFeeStructureType):Promise<FeeStructure> => {
  return feeStructureSchema.parse((await api.post('/fees/structure',body)).data)
};

export const getFeeStructure = async (sectionId: string,academicYearId: string):Promise<FeeStructure> => {
  return feeStructureSchema.parse((await api.get('/fees/structure',{ params: {
    sectionId,academicYearId
  }})).data)
}

export const updateFeeStructure = async (id: string, body: UpdateFeeStructureType): Promise<FeeStructure> => {
  return feeStructureSchema.parse((await api.patch(`/fees/structure/${id}`, body)).data);
};

export const generateInvoices = async (body: generateInvoicesType):Promise<generateInvoicesResultType> => {
  return generateInvoicesResultSchema.parse(
    (
      await api.post('/fees/invoices/generate', body, {
        // One insert per student in the section; the default 15s abandons it
        // while the server is still writing, which is the false failure the
        // create-students import hit first.
        timeout: INVOICE_GENERATION_TIMEOUT_MS,
      })
    ).data,
  );
}

/**
 * `/fees/invoices/me` answers with the *student* invoice shape — `feeBreakdown`
 * plus a trimmed payment list — not the admin invoice (which embeds the whole
 * `feeStructure`). Parsing it with `invoiceArraySchema` threw on the missing
 * `studentId`/`feeStructure` fields, so this screen failed with "Couldn't load
 * your invoices" for every student, on every invoice.
 */
export const getMyInvoices = async (): Promise<StudentInvoices> => {
  return studentInvoicesSchema.parse((await api.get('/fees/invoices/me')).data);
};

export const getStudentInvoices = async (studentId: string):Promise<StudentInvoices> => {
  return studentInvoicesSchema.parse((await api.get(`/fees/invoices/student/${studentId}`)).data)
}

export const getInvoice = async (id: string): Promise<SingleInvoice> => {
  return singleInvoiceSchema.parse((await api.get(`/fees/invoices/${id}`)).data);
};

export const createPaymentOrder = async (invoiceId: string): Promise<PaymentOrder> => {
  return paymentOrderSchema.parse(
    (await api.post(`/fees/invoices/${invoiceId}/payment-order`)).data,
  );
};

const verifyPaymentResponseSchema = z.object({
  alreadyProcessed: z.boolean(),
  // Present when the captured amount exceeded the invoice balance. The server
  // records the row as `RefundRequired` and issues nothing automatically, so
  // this is the only signal the student gets — dropping it means telling someone
  // "payment successful" about money that is owed back to them.
  refundRequired: z.boolean().optional(),
  refundAmount: z.number().optional(),
});

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<z.infer<typeof verifyPaymentResponseSchema>> => {
  return verifyPaymentResponseSchema.parse(
    (await api.post('/fees/payments/verify', payload)).data,
  );
};



