import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { DayCellStatus, getLeadingBlankCount, getMonthGrid } from '@/src/libs/month';

const STATUS_COLOR: Record<DayCellStatus, { bg: string; text: string }> = {
  Present: { bg: '#10B981', text: '#FFFFFF' },
  Absent: { bg: '#F43F5E', text: '#FFFFFF' },
  Late: { bg: '#F59E0B', text: '#FFFFFF' },
  Holiday: { bg: '#F3F4F6', text: '#9CA3AF' },
  Weekend: { bg: '#F3F4F6', text: '#9CA3AF' },
  Future: { bg: '#F9FAFB', text: '#D1D5DB' },
  NoData: { bg: '#F3F4F6', text: '#9CA3AF' },
};

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface MonthlyAttendanceGridProps {
  year: number;
  month: number; // 0-indexed
  calendarDays: { date: Date; type: string }[];
  attendance: { date: Date; status: string }[];
  onPrevMonth: () => void;
  onNextMonth: () => void;
  disableNext: boolean;
}

const MONTH_LABELS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const MonthlyAttendanceGrid = ({
  year,
  month,
  calendarDays,
  attendance,
  onPrevMonth,
  onNextMonth,
  disableNext,
}: MonthlyAttendanceGridProps) => {
  const cells = getMonthGrid(year, month, calendarDays, attendance);
  const leadingBlanks = getLeadingBlankCount(year, month);

  return (
    <View className="bg-white rounded-2xl border border-gray-100 mx-4 p-4">
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center gap-2">
          <Feather name="calendar" size={16} color="#2563EB" />
          <Text className="text-base font-bold text-gray-900">
            Monthly Attendance Grid
          </Text>
        </View>
      </View>

      <View className="flex-row items-center justify-center gap-6 py-2 border-b border-gray-100 mb-3">
        <Pressable onPress={onPrevMonth} hitSlop={10}>
          <Feather name="chevron-left" size={18} color="#374151" />
        </Pressable>
        <Text className="text-sm font-semibold text-gray-700 w-24 text-center">
          {MONTH_LABELS[month]} {year}
        </Text>
        <Pressable onPress={onNextMonth} hitSlop={10} disabled={disableNext}>
          <Feather name="chevron-right" size={18} color={disableNext ? '#D1D5DB' : '#374151'} />
        </Pressable>
      </View>

      <View className="flex-row justify-between mb-2">
        {WEEKDAY_LABELS.map((l, idx) => (
          <Text key={idx} className="text-xs font-medium text-gray-400 w-9 text-center">
            {l}
          </Text>
        ))}
      </View>

      <View className="flex-row flex-wrap">
        {Array.from({ length: leadingBlanks }).map((_, i) => (
          <View key={`blank-${i}`} className="w-9 h-9 m-0.5" />
        ))}
        {cells.map((cell) => {
          const colors = STATUS_COLOR[cell.status];
          return (
            <View
              key={cell.day}
              className="w-9 h-9 m-0.5 rounded-full items-center justify-center"
              style={{ backgroundColor: colors.bg }}
            >
              <Text
                className="text-xs font-semibold"
                style={{ color: colors.text }}
              >
                {cell.day}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
};

export default MonthlyAttendanceGrid;