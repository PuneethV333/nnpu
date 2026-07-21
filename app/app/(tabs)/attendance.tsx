import React, { useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceRow from '@/components/attendance-page/AttendanceRow';
import SummaryCard from '@/components/attendance-page/SummaryCard';
import WeekNavigator from '@/components/attendance-page/WeekNavigator';
import ProgressCard from '@/components/attendance-page/ProgressCard';
import MonthlyAttendanceGrid from '@/components/attendance-page/MonthlyAttendanceGrid';
import {
  formatRangeLabel,
  getWeekDays,
  getWeekRange,
  toISODate,
} from '@/src/libs/week';
import { useGetMyAttendance } from '@/src/hooks/useAttendance';
import { AttendanceArray } from '@/src/types/attendance';

export const dummyAttendance: AttendanceArray = [
  { id: '1', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-19'), status: 'Present', markedById: 't1' },
  { id: '2', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-18'), status: 'Present', markedById: 't1' },
  { id: '3', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-17'), status: 'Late', markedById: 't1' },
  { id: '4', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-16'), status: 'Absent', markedById: 't1' },
  { id: '5', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-15'), status: 'Present', markedById: 't1' },
  { id: '6', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-14'), status: 'Present', markedById: 't1' },
  { id: '7', studentId: 's1', sectionId: 'sec1', date: new Date('2026-07-13'), status: 'NotMarked', markedById: null },
];

const dummyCalendarDays = [
  { date: new Date('2026-07-01'), type: 'Working' },
  { date: new Date('2026-07-04'), type: 'Weekend' },
  { date: new Date('2026-07-05'), type: 'Weekend' },
  { date: new Date('2026-07-11'), type: 'Weekend' },
  { date: new Date('2026-07-15'), type: 'Holiday' },
];

const dummyMonthlyRate = { percentage: 92, label: 'July 2026' };
const dummyYearlyRate = { percentage: 92, label: 'Current Session' };

const USE_DUMMY = true; // flip to false once backend is wired

const AttendancePage = () => {
  const [weekOffset, setWeekOffset] = useState(0);
  const [monthYear, setMonthYear] = useState(2026);
  const [month, setMonth] = useState(6); // July, 0-indexed

  const { monday, saturday } = getWeekRange(weekOffset);
  const from = toISODate(monday);
  const to = toISODate(saturday);
  const weekDays = getWeekDays(monday);

  const { data, isLoading, isError } = useGetMyAttendance(from, to);
  const attendance = USE_DUMMY ? dummyAttendance : data;

  const recordByDate = new Map(
    (attendance ?? []).map((a) => [toISODate(a.date), a]),
  );

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setMonthYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (month === 11) {
      setMonth(0);
      setMonthYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const today = new Date();
  const disableNextMonth =
    monthYear > today.getFullYear() ||
    (monthYear === today.getFullYear() && month >= today.getMonth());

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>
        <Text className="text-2xl inter_bold text-gray-900 px-4 pt-4 pb-3">
          My Attendance
        </Text>

        <ProgressCard
          title="Monthly Attendance Rate"
          percentage={dummyMonthlyRate.percentage}
          subtitle={dummyMonthlyRate.label}
          color="#2563EB"
        />
        <ProgressCard
          title="Academic Year Attendance Rate"
          percentage={dummyYearlyRate.percentage}
          subtitle={dummyYearlyRate.label}
          color="#10B981"
        />

        <MonthlyAttendanceGrid
          year={monthYear}
          month={month}
          calendarDays={dummyCalendarDays}
          attendance={dummyAttendance}
          onPrevMonth={goPrevMonth}
          onNextMonth={goNextMonth}
          disableNext={disableNextMonth}
        />

        <Text className="text-lg inter_bold text-gray-900 px-4 mt-5 mb-2">
          Weekly Breakdown
        </Text>

        <WeekNavigator
          label={formatRangeLabel(monday, saturday)}
          onPrev={() => setWeekOffset((w) => w - 1)}
          onNext={() => setWeekOffset((w) => w + 1)}
          isCurrentWeek={weekOffset === 0}
          disableNext={weekOffset >= 0}
        />

        {!USE_DUMMY && isLoading && <ActivityIndicator className="mt-8" color="#2563EB" />}

        {!USE_DUMMY && isError && (
          <Text className="text-red-500 text-sm px-4">
            Couldn&apos;t load attendance. Try again later.
          </Text>
        )}

        {attendance && (
          <>
            <SummaryCard data={attendance} />

            <View className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100 mb-20">
              {weekDays.map((day) => (
                <AttendanceRow
                  key={toISODate(day)}
                  date={day}
                  record={recordByDate.get(toISODate(day)) ?? null}
                />
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendancePage;