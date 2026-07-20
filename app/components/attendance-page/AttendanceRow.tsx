import React from 'react'
import { View, Text } from 'react-native';
import { Attendance } from '@/src/types/attendance';
import StatusBadge from './StatusBadge';
import { formatDayLabel } from '@/src/libs/week';

interface AttendanceRowProps {
  date: Date;
  record: Attendance | null;
}

const AttendanceRow = ({ date, record }: AttendanceRowProps) => (
  <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 last:border-b-0">
    <Text className="text-sm text-gray-700">{formatDayLabel(date)}</Text>
    <StatusBadge status={record?.status ?? 'NotMarked'} />
  </View>
);

export default AttendanceRow;