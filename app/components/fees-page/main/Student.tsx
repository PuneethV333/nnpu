import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import RazorpayCheckout from 'react-native-razorpay';
import {
  useGetMyInvoices,
  useCreatePaymentOrder,
  useVerifyPayment,
} from '@/src/hooks/useFees';
import { Invoice } from '@/src/types/fees';
import { formatMoney } from '@/src/libs/money';
import { EmptyState, ErrorState } from '@/components/ui/Feedback';
import { InvoiceCardSkeleton, SkeletonStatRow } from '@/components/ui/skeletons';
import InvoiceCard from '../InvoiceCard';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

const SummaryTile = ({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'neutral' | 'green' | 'red';
}) => {
  const color =
    tone === 'green' ? '#16A34A' : tone === 'red' ? '#DC2626' : '#111827';

  return (
    <View className="flex-1 bg-white rounded-2xl border border-gray-100 items-center py-4 mx-1">
      <Text className="text-lg font-bold" style={{ color }}>
        {value}
      </Text>
      <Text className="text-xs text-gray-500 mt-1">{label}</Text>
    </View>
  );
};

const FeesPage = () => {
  const tabBarClearance = useTabBarClearance();
  const { data, isLoading, isError, refetch, isRefetching } = useGetMyInvoices();
  const { mutateAsync: createOrder } = useCreatePaymentOrder();
  const { mutateAsync: verify } = useVerifyPayment();
  const [payingInvoiceId, setPayingInvoiceId] = useState<string | null>(null);

  const invoices = useMemo(() => data ?? [], [data]);

  const { totalPending, totalPaid, overdueCount } = useMemo(() => {
    const now = new Date();
    let pending = 0;
    let paid = 0;
    let overdue = 0;

    invoices.forEach((inv) => {
      const due = inv.totalAmount - inv.paidAmount;
      if (due > 0) {
        pending += due;
        if (inv.dueDate < now) overdue += 1;
      } else {
        paid += inv.paidAmount;
      }
    });

    return {
      totalPending: pending,
      totalPaid: paid,
      overdueCount: overdue,
    };
  }, [invoices]);

  const handlePay = async (invoice: Invoice) => {
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
    } catch (err) {
      const code = (err as { code?: number } | null)?.code;
      if (code === 0) return; // checkout dismissed — not an error

      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? 'Something went wrong. Please try again.';
      Alert.alert('Payment failed', message);
    } finally {
      setPayingInvoiceId(null);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#2563EB"
          />
        }
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">
          My Fees
        </Text>

        {isLoading ? (
          <>
            <View style={{ marginTop: 12 }}>
              <SkeletonStatRow />
            </View>
            <InvoiceCardSkeleton />
          </>
        ) : isError ? (
          <ErrorState
            title="Couldn't load your invoices"
            subtitle="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : invoices.length === 0 ? (
          <EmptyState
            icon="file-text"
            title="No invoices yet"
            subtitle="Fee invoices published by the school will appear here."
          />
        ) : (
          <>
            <View className="flex-row mx-3 mb-2">
              <SummaryTile
                label="Pending"
                value={formatMoney(totalPending)}
                tone={totalPending > 0 ? 'red' : 'green'}
              />
              <SummaryTile label="Paid" value={formatMoney(totalPaid)} tone="green" />
            </View>

            {overdueCount > 0 && (
              <View className="mx-4 mb-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 flex-row items-center gap-2">
                <Feather name="alert-triangle" size={15} color="#DC2626" />
                <Text className="text-sm font-semibold text-red-700 flex-1">
                  {overdueCount} invoice{overdueCount > 1 ? 's are' : ' is'} past
                  the due date.
                </Text>
              </View>
            )}

            {invoices.map((invoice) => (
              <InvoiceCard
                key={invoice.id}
                invoice={invoice}
                onPay={handlePay}
                isPaying={payingInvoiceId === invoice.id}
              />
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default FeesPage;
