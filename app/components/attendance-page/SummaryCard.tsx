import React from 'react';
import { View, Text } from 'react-native';
import { AttendanceArray } from '@/src/types/attendance';

const SummaryCard = ({ data }: { data: AttendanceArray }) => {
  const present = data.filter((a) => a.status === 'Present' || a.status === 'Late').length;
  const total = data.filter((a) => a.status !== 'NotMarked').length;
  const percentage = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <View className="mx-4 bg-blue-50 rounded-2xl border border-blue-100 p-4 items-center">
      <Text className="text-3xl font-bold text-blue-700">{percentage}%</Text>
      <Text className="text-sm text-blue-600 mt-1">Attendance this period</Text>
    </View>
  );
};

export default SummaryCard;