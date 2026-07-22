import React from 'react'
import { View, Text } from 'react-native';
import { Invoice } from '@/src/types/fees';

const STYLE: Record<Invoice['status'], { bg: string; text: string; label: string }> = {
  Paid: { bg: '#DCFCE7', text: '#16A34A', label: 'Paid' },
  Partial: { bg: '#FEF3C7', text: '#D97706', label: 'Partially Paid' },
  Pending: { bg: '#FEE2E2', text: '#DC2626', label: 'Pending' },
};

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
  const s = STYLE[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: s.text, fontSize: 12, fontWeight: '700' }}>{s.label}</Text>
    </View>
  );
};

export default StatusBadge;