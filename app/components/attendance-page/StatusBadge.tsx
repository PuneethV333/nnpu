import React from 'react';
import { View, Text } from 'react-native';
import { Attendance } from '@/src/types/attendance';

const STATUS_STYLE: Record<Attendance['status'], { bg: string; text: string; label: string }> = {
  Present: { bg: '#DCFCE7', text: '#16A34A', label: 'Present' },
  Late: { bg: '#FEF3C7', text: '#D97706', label: 'Late' },
  Absent: { bg: '#FEE2E2', text: '#DC2626', label: 'Absent' },
  NotMarked: { bg: '#F3F4F6', text: '#6B7280', label: 'Not Marked' },
};

const StatusBadge = ({ status }: { status: Attendance['status'] }) => {
  const s = STATUS_STYLE[status];
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}>
      <Text style={{ color: s.text, fontSize: 12, fontWeight: '600' }}>{s.label}</Text>
    </View>
  );
};

export default StatusBadge;