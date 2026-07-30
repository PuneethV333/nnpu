import React, { useState } from "react";
import { View, Text, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AttendanceRow from "@/components/attendance-page/AttendanceRow";
import SummaryCard from "@/components/attendance-page/SummaryCard";
import WeekNavigator from "@/components/attendance-page/WeekNavigator";
import ProgressCard from "@/components/attendance-page/ProgressCard";
import MonthlyAttendanceGrid from "@/components/attendance-page/MonthlyAttendanceGrid";
import {
  formatRangeLabel,
  getWeekDays,
  getWeekRange,
  toISODate,
} from "@/src/libs/week";
import { useGetMyAttendance, useGetMySummary } from "@/src/hooks/useAttendance";
import { useGetRange } from "@/src/hooks/useCalendar";
import { getYearRange } from "@/src/libs/getYearRange";
import { getMonthRange } from "@/src/libs/getMonthRange";
import { MONTH_LABELS } from "@/constants/months";

const AttendancePage = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const today = new Date();
  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { monday, saturday } = getWeekRange(weekOffset);
  const from = toISODate(monday);
  const to = toISODate(saturday);
  const weekDays = getWeekDays(monday);

  const { data: attendance, isLoading, isError } = useGetMyAttendance(from, to);

  const { from: monthFrom, to: monthTo } = getMonthRange(monthYear, month);
  const { data: calendarDays } = useGetRange(monthFrom, monthTo);

  const { data: monthlyAttendance } = useGetMyAttendance(monthFrom, monthTo);

  const { data: monthlySummary } = useGetMySummary(monthFrom, monthTo);

  const { from: yearFrom, to: yearTo } = getYearRange();
  const { data: yearlySummary } = useGetMySummary(yearFrom, yearTo);

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

  const disableNextMonth =
    monthYear > today.getFullYear() ||
    (monthYear === today.getFullYear() && month >= today.getMonth());

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={["top"]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
      >
        <Text className="text-2xl inter_bold text-gray-900 px-4 pt-4 pb-3">
          My Attendance
        </Text>

        <ProgressCard
          title="Monthly Attendance Rate"
          percentage={monthlySummary?.percentage ?? 0}
          subtitle={`${MONTH_LABELS[month]} ${monthYear}`}
          color="#2563EB"
        />
        <ProgressCard
          title="Academic Year Attendance Rate"
          percentage={yearlySummary?.percentage ?? 0}
          subtitle="Current Session"
          color="#10B981"
        />

        <MonthlyAttendanceGrid
          year={monthYear}
          month={month}
          calendarDays={calendarDays ?? []}
          attendance={monthlyAttendance ?? []}
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

        {isLoading && <ActivityIndicator className="mt-8" color="#2563EB" />}

        {isError && (
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
