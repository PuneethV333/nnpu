import {
  invoiceArraySchema,
  InvoiceArray,
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
  return generateInvoicesResultSchema.parse((await api.post('/fees/invoices/generate',body)).data)
}

export const getMyInvoices = async (): Promise<InvoiceArray> => {
  return invoiceArraySchema.parse((await api.get('/fees/invoices/me')).data);
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
});

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ alreadyProcessed: boolean }> => {
  return verifyPaymentResponseSchema.parse(
    (await api.post('/fees/payments/verify', payload)).data,
  );
};



