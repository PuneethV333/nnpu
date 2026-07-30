import React from 'react';
import { View, Text, Pressable, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { Invoice } from '@/src/types/fees';
import StatusBadge from './StatusBadge';

const formatMoney = (n: number) => `₹${n.toLocaleString('en-IN')}`;
const formatDate = (d: Date) =>
  d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const FEE_ROWS: { key: keyof Invoice['feeStructure']; label: string }[] = [
  { key: 'tuitionFee', label: 'Tuition Fee' },
  { key: 'examFee', label: 'Exam Fee' },
  { key: 'transportFee', label: 'Transport Fee' },
  { key: 'hostelFee', label: 'Hostel Fee' },
  { key: 'otherFee', label: 'Other Fee' },
];

interface InvoiceCardProps {
  invoice: Invoice;
  onPay: (invoice: Invoice) => void;
  isPaying: boolean;
}

const InvoiceCard = ({ invoice, onPay, isPaying }: InvoiceCardProps) => {
  const pending = invoice.totalAmount - invoice.paidAmount;
  const isOverdue = invoice.status !== 'Paid' && invoice.dueDate < new Date();

  return (
    <View className="bg-white rounded-2xl border border-gray-100 mx-4 mb-4 p-4">
      <View className="flex-row items-start justify-between">
        <View>
          <Text className="text-base font-bold text-gray-900">
            {invoice.description ?? 'Fee Invoice'}
          </Text>
          <View className="flex-row items-center gap-1 mt-1">
            <Feather name={isOverdue ? 'alert-circle' : 'calendar'} size={12} color={isOverdue ? '#DC2626' : '#9CA3AF'} />
            <Text className={`text-xs ${isOverdue ? 'text-red-500 font-semibold' : 'text-gray-400'}`}>
              {isOverdue ? 'Overdue — was due ' : 'Due '}
              {formatDate(invoice.dueDate)}
            </Text>
          </View>
        </View>
        <StatusBadge status={invoice.status} />
      </View>

      <View className="mt-4 pt-3 border-t border-gray-100">
        {FEE_ROWS.map(({ key, label }) => {
          const amount = invoice.feeStructure[key] as number;
          if (amount === 0) return null;
          return (
            <View key={key} className="flex-row items-center justify-between py-1">
              <Text className="text-sm text-gray-500">{label}</Text>
              <Text className="text-sm text-gray-700">{formatMoney(amount)}</Text>
            </View>
          );
        })}
      </View>

      <View className="mt-3 pt-3 border-t border-gray-100">
        <View className="flex-row items-center justify-between">
          <Text className="text-sm font-semibold text-gray-500">Total</Text>
          <Text className="text-sm font-bold text-gray-900">{formatMoney(invoice.totalAmount)}</Text>
        </View>
        <View className="flex-row items-center justify-between mt-1">
          <Text className="text-sm font-semibold text-gray-500">Paid</Text>
          <Text className="text-sm font-bold text-green-600">{formatMoney(invoice.paidAmount)}</Text>
        </View>
        {pending > 0 && (
          <View className="flex-row items-center justify-between mt-1">
            <Text className="text-sm font-semibold text-gray-500">Pending</Text>
            <Text className="text-sm font-bold text-red-600">{formatMoney(pending)}</Text>
          </View>
        )}
      </View>

      {pending > 0 && (
        <Pressable
          onPress={() => onPay(invoice)}
          disabled={isPaying}
          className="mt-4 bg-blue-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
        >
          {isPaying ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Feather name="credit-card" size={16} color="#FFFFFF" />
              <Text className="text-white font-bold text-[15px]">
                Pay {formatMoney(pending)}
              </Text>
            </>
          )}
        </Pressable>
      )}
    </View>
  );
};

export default InvoiceCard;