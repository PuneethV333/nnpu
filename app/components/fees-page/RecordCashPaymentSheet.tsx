import React, { useMemo, useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import {
  BottomSheet,
  Field,
  FieldLabel,
  PrimaryButton,
} from '@/components/ui/Primitives';
import { useRecordManualPayment } from '@/src/hooks/useFees';
import { formatMoney, paiseToRupees, rupeesToPaise } from '@/src/libs/money';
import { errorMessage } from '@/src/libs/errorMessage';
import { colors } from '@/constants/theme';

/**
 * Records fees collected outside Razorpay.
 *
 * The amount defaults to the whole outstanding balance because that is what the
 * counter takes in the normal case — the sheet is one tap for "they paid in
 * cash". A part payment is still allowed by editing the figure, and anything
 * above the balance is blocked here *and* on the server: money the school has to
 * hand back should not be recorded in the first place.
 */
const METHODS = [
  { key: 'CASH', label: 'Cash', referenceLabel: 'Receipt no. (optional)' },
  { key: 'UPI', label: 'UPI', referenceLabel: 'UPI reference (optional)' },
  { key: 'CHEQUE', label: 'Cheque', referenceLabel: 'Cheque no. (optional)' },
  {
    key: 'BANK_TRANSFER',
    label: 'Bank transfer',
    referenceLabel: 'Transfer reference (optional)',
  },
] as const;

type Method = (typeof METHODS)[number]['key'];

type Props = {
  invoice: {
    id: string;
    description: string | null;
    totalAmount: number;
    paidAmount: number;
    balanceAmount: number;
  };
  onClose: () => void;
};

const RecordCashPaymentSheet = ({ invoice, onClose }: Props) => {
  const [method, setMethod] = useState<Method>('CASH');
  const [amountText, setAmountText] = useState(() =>
    String(paiseToRupees(invoice.balanceAmount)),
  );
  const [reference, setReference] = useState('');
  const record = useRecordManualPayment();

  const selected = METHODS.find((m) => m.key === method) ?? METHODS[0];
  const amount = useMemo(() => rupeesToPaise(amountText), [amountText]);

  const tooMuch = amount !== null && amount > invoice.balanceAmount;
  const invalid = amount === null || amount <= 0 || tooMuch;

  const submit = () => {
    if (amount === null || invalid) return;

    record.mutate(
      {
        invoiceId: invoice.id,
        method,
        amount,
        reference: reference.trim() || undefined,
      },
      {
        onSuccess: (res) =>
          Alert.alert(
            'Payment recorded',
            `${formatMoney(res.amount)} received by ${selected.label.toLowerCase()}.` +
              (res.balanceAmount > 0
                ? ` ${formatMoney(res.balanceAmount)} still due.`
                : ' This invoice is now fully paid.'),
            [{ text: 'Done', onPress: onClose }],
          ),
        onError: (err) => Alert.alert('Could not record payment', errorMessage(err)),
      },
    );
  };

  return (
    <BottomSheet
      title="Record a payment"
      subtitle={`${invoice.description ?? 'Fee Invoice'} · ${formatMoney(invoice.balanceAmount)} due`}
      onClose={onClose}
    >
      <FieldLabel>Paid by</FieldLabel>
      <View className="flex-row flex-wrap mb-4" style={{ gap: 8 }}>
        {METHODS.map((m) => {
          const active = m.key === method;
          return (
            <Pressable
              key={m.key}
              onPress={() => setMethod(m.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              className="rounded-full px-3 py-1.5 border"
              style={{
                backgroundColor: active ? colors.accent : '#FFFFFF',
                borderColor: active ? colors.accent : '#E5E7EB',
              }}
            >
              <Text
                className="text-sm font-medium"
                style={{ color: active ? '#FFFFFF' : '#374151' }}
              >
                {m.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Field
        label="Amount received (₹)"
        value={amountText}
        onChangeText={setAmountText}
        placeholder="0"
        keyboardType="decimal-pad"
        autoCapitalize="none"
      />

      {tooMuch ? (
        <Text className="text-xs mb-3" style={{ color: colors.danger }}>
          More than the {formatMoney(invoice.balanceAmount)} owed on this invoice.
        </Text>
      ) : (
        <Text className="text-xs mb-3 text-gray-500">
          {amount !== null && amount > 0
            ? `Balance after this: ${formatMoney(invoice.balanceAmount - amount)}`
            : 'Enter the amount received.'}
        </Text>
      )}

      <Field
        label={selected.referenceLabel}
        value={reference}
        onChangeText={setReference}
        placeholder="Optional"
        autoCapitalize="characters"
      />

      <PrimaryButton
        label={
          amount !== null && amount > 0
            ? `Record ${formatMoney(amount)}`
            : 'Record payment'
        }
        icon="check"
        onPress={submit}
        disabled={invalid}
        loading={record.isPending}
      />
      <View className="h-2" />
      <PrimaryButton label="Cancel" tone="neutral" onPress={onClose} />
    </BottomSheet>
  );
};

export default RecordCashPaymentSheet;
