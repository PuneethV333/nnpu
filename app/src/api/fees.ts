import {
  invoiceArraySchema,
  InvoiceArray,
  paymentOrderSchema,
  PaymentOrder,
} from '@/src/types/fees';
import { api } from './client';

export const getMyInvoices = async (): Promise<InvoiceArray> => {
  return invoiceArraySchema.parse((await api.get('/fees/invoices/me')).data);
};

export const createPaymentOrder = async (invoiceId: string): Promise<PaymentOrder> => {
  return paymentOrderSchema.parse(
    (await api.post(`/fees/invoices/${invoiceId}/payment-order`)).data,
  );
};

export const verifyPayment = async (payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<{ alreadyProcessed: boolean }> => {
  return (await api.post('/fees/payments/verify', payload)).data;
};