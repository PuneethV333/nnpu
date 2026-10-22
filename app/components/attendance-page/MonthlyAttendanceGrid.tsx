import React, { useState } from 'react';
import { View, Text, Pressable, useWindowDimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import {
  DayCellStatus,
  getLeadingBlankCount,
  getMonthGrid,
} from '@/src/libs/month';

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

/** 7 columns, always. A calendar is a fixed grid — it must never wrap by width. */
const COLUMNS = 7;
/** Horizontal gutter between two columns. */
const COLUMN_GAP = 6;
/** Cards using this component sit inside `mx-4` + `p-4` (16 + 16 on each side). */
const CARD_INSET = 64;
/** Cap so the grid does not grow into giant circles on tablets. */
const MAX_CELL = 44;

type GridCell = ReturnType<typeof getMonthGrid>[number];

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
  const { width: windowWidth } = useWindowDimensions();
  // Seeded from the window so the first frame is already correct, then
  // corrected by onLayout in case the card is not full-bleed.
  const [gridWidth, setGridWidth] = useState(
    Math.max(windowWidth - CARD_INSET, 0),
  );

  const cells = getMonthGrid(year, month, calendarDays, attendance);
  const leadingBlanks = getLeadingBlankCount(year, month);

  const cellSize =
    gridWidth > 0
      ? Math.min(
          Math.floor((gridWidth - COLUMN_GAP * (COLUMNS - 1)) / COLUMNS),
          MAX_CELL,
        )
      : 0;

  const slots: (GridCell | null)[] = [
    ...Array.from({ length: leadingBlanks }, () => null),
    ...cells,
  ];
  const weeks: (GridCell | null)[][] = [];
  for (let i = 0; i < slots.length; i += COLUMNS) {
    const row = slots.slice(i, i + COLUMNS);
    while (row.length < COLUMNS) row.push(null);
    weeks.push(row);
  }

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

      <View
        onLayout={(e) => {
          const next = Math.round(e.nativeEvent.layout.width);
          if (next > 0 && next !== gridWidth) setGridWidth(next);
        }}
      >
        {cellSize > 0 && (
          <>
            {/* Weekday header uses the exact same cell width + gutter as the
                day rows, so each label sits centred over its own column. */}
            <View
              className="flex-row mb-2"
              style={{ justifyContent: 'center', columnGap: COLUMN_GAP }}
            >
              {WEEKDAY_LABELS.map((label, i) => (
                <Text
                  key={i}
                  className="text-xs font-medium text-gray-400 text-center"
                  style={{ width: cellSize }}
                >
                  {label}
                </Text>
              ))}
            </View>

            {weeks.map((week, weekIndex) => (
              <View
                key={weekIndex}
                className="flex-row"
                style={{
                  justifyContent: 'center',
                  columnGap: COLUMN_GAP,
                  marginBottom:
                    weekIndex === weeks.length - 1 ? 0 : COLUMN_GAP,
                }}
              >
                {week.map((cell, colIndex) => {
                  if (!cell) {
                    return (
                      <View
                        key={`blank-${weekIndex}-${colIndex}`}
                        style={{ width: cellSize, height: cellSize }}
                      />
                    );
                  }

                  const colors = STATUS_COLOR[cell.status];
                  return (
                    <View
                      key={cell.day}
                      className="items-center justify-center"
                      style={{
                        width: cellSize,
                        height: cellSize,
                        borderRadius: cellSize / 2,
                        backgroundColor: colors.bg,
                      }}
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
            ))}
          </>
        )}
      </View>
    </View>
  );
};

export default MonthlyAttendanceGrid;
