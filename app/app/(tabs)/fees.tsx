import React,{useState} from 'react';
import {  Text, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import RazorpayCheckout from 'react-native-razorpay';
import { useGetMyInvoices, useCreatePaymentOrder, useVerifyPayment } from '@/src/hooks/useFees';
import { Invoice } from '@/src/types/fees';
import { dummyInvoices } from '@/constants/dummy/fees';
import InvoiceCard from '@/components/fees-page/InvoiceCard,';

const USE_DUMMY = true;

const FeesPage = () => {
  const { data } = useGetMyInvoices();
  const { mutateAsync: createOrder } = useCreatePaymentOrder();
  const { mutateAsync: verify } = useVerifyPayment();
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const invoices = USE_DUMMY ? dummyInvoices : data;

  const handlePay = async (invoice: Invoice) => {
    if (USE_DUMMY) {
      Alert.alert('Demo mode', 'Payment flow is disabled while USE_DUMMY is true.');
      return;
    }

    setPayingInvoiceId(invoice.id);
    try {
      const order = await createOrder(invoice.id);

      const result = await RazorpayCheckout.open({
        key: order.key,
        amount: order.amount,
        currency: order.currency,
        order_id: order.orderId,
        name: 'School Fees',
        description: invoice.description ?? 'Fee Payment',
        theme: { color: '#2563EB' },
      });

      await verify({
        razorpay_order_id: result.razorpay_order_id,
        razorpay_payment_id: result.razorpay_payment_id,
        razorpay_signature: result.razorpay_signature,
      });

      Alert.alert('Payment successful', 'Your fee payment has been recorded.');
    } catch (err: any) {
      if (err?.code === 0) {
        // user cancelled checkout — not a real error
        return;
      }
      Alert.alert('Payment failed', 'Something went wrong. Please try again.');
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">Fees</Text>

      {!invoices ? (
        <Text className="text-gray-400 text-sm px-4">Loading...</Text>
      ) : invoices.length === 0 ? (
        <Text className="text-gray-400 text-sm px-4">No invoices found.</Text>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 135 }}>
          {invoices.map((invoice) => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              onPay={handlePay}
              isPaying={payingInvoiceId === invoice.id}
            />
          ))}
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FeesPage;