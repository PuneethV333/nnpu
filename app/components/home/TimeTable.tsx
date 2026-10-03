import React from 'react'
import { View, Text } from 'react-native';
import { TimetableSlotType } from '@/src/types/timeTable';

/** A slot rendered as a card — the row itself, without id/order metadata. */
export type TimeTableSlot = Pick<
  TimetableSlotType,
  'startTime' | 'endTime' | 'isBreak' | 'label' | 'options'
>;

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};

/** Highlights the slot that contains the current wall-clock time. */
const isCurrentPeriod = (start: string, end: string) => {
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  return nowMins >= toMinutes(start) && nowMins < toMinutes(end);
};

const TimeTable = ({
  startTime,
  endTime,
  isBreak,
  label,
  options,
}: TimeTableSlot) => {
  if (isBreak) {
    return (
      <View className="flex-row items-center justify-center bg-gray-100 rounded-xl py-2.5">
        <Text className="text-xs font-semibold text-gray-500 tracking-wide">
          {label}
        </Text>
        <Text className="text-xs text-gray-400 ml-2">
          {startTime} - {endTime}
        </Text>
      </View>
    );
  }

  const active = isCurrentPeriod(startTime, endTime);

  return (
    <View
      className={`flex-row bg-white rounded-2xl p-4 border ${
        active ? 'border-blue-200 bg-blue-50' : 'border-gray-100'
      }`}
    >
      {active && <View className="w-1 rounded-full bg-blue-500 mr-3 -ml-1" />}

      <View className="w-16 justify-center">
        <Text className="text-xs font-medium text-gray-500">{startTime}</Text>
        <Text className="text-xs text-gray-400">{endTime}</Text>
      </View>

      <View className="flex-1 ml-3">
        {options.length === 0 ? (
          <Text className="text-sm italic text-gray-400">Free period</Text>
        ) : (
          options.map((opt, idx) => (
            <View
              key={`${opt.subject}-${idx}`}
              className={idx > 0 ? 'mt-2 pt-2 border-t border-gray-100' : ''}
            >
              <Text className="text-[15px] font-semibold text-gray-900">
                {opt.subject}
                {opt.language ? ` (${opt.language})` : ''}
              </Text>
              {opt.teacher && (
                <Text className="text-[13px] text-gray-500 mt-0.5">
                  {opt.teacher}
                </Text>
              )}
            </View>
          ))
        )}
      </View>

      {active && (
        <View className="bg-blue-500 rounded-full px-2 py-0.5 self-start">
          <Text className="text-[10px] font-bold text-white">NOW</Text>
        </View>
      )}
    </View>
  );
};

export default TimeTable;
