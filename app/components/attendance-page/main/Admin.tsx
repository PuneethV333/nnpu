import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useGetAdminDashboard } from '@/src/hooks/useDashboard';
import { useGetRange } from '@/src/hooks/useCalendar';
import { toISODate } from '@/src/libs/week';
import { getMonthRange } from '@/src/libs/getMonthRange';
import { DAY_CHIP_COLOR } from '@/constants/dayTypeColor';
import MonthlyAttendanceGrid from '../MonthlyAttendanceGrid';
import { ErrorState, EmptyState } from '@/components/ui/Feedback';
import {
  SkeletonCard,
  SkeletonStatRow,
  CalendarGridSkeleton,
  Skeleton,
} from '@/components/ui/skeletons';
import { useTabBarClearance } from '@/src/hooks/useTabBarClearance';

/**
 * School-wide attendance view for Admins.
 *
 * Deliberately read-only: per-section rosters/marking live behind
 * `@Roles('Teacher')` on `/attendance/roster|mark|status`, so the only
 * Admin-guaranteed attendance surface is `GET /dashboard/admin`
 * (`attendanceToday`) plus the shared calendar. Admins who also need to
 * mark attendance should be given the Teacher role for that section.
 */
const Admin = () => {
  const tabBarClearance = useTabBarClearance();
  const today = new Date();

  const [monthYear, setMonthYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const { data: dashboard, isLoading, isError, refetch } = useGetAdminDashboard();

  const { from: monthFrom, to: monthTo } = getMonthRange(monthYear, month);
  const { data: calendarDays } = useGetRange(monthFrom, monthTo);

  const disableNext =
    monthYear > today.getFullYear() ||
    (monthYear === today.getFullYear() && month >= today.getMonth());

  const goPrevMonth = () => {
    if (month === 0) {
      setMonth(11);
      setMonthYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (disableNext) return;
    if (month === 11) {
      setMonth(0);
      setMonthYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const coverage = dashboard?.attendanceToday;
  const unmarked = coverage
    ? Math.max(0, coverage.totalStudents - coverage.marked)
    : 0;

  const events = useMemo(
    () => dashboard?.upcomingEvents ?? [],
    [dashboard],
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: tabBarClearance }}
      >
        <Text className="text-2xl font-bold text-gray-900 px-4 pt-4 pb-3">
          Attendance
        </Text>

        {isLoading ? (
          <>
            <View style={{ marginTop: 12 }}>
              <SkeletonStatRow />
            </View>
            <SkeletonCard style={{ marginHorizontal: 16, marginBottom: 12 }}>
              <Skeleton width="55%" height={10} radius="sm" />
              <Skeleton width="40%" height={32} radius="sm" />
              <Skeleton height={8} radius="full" />
            </SkeletonCard>
            <CalendarGridSkeleton />
          </>
        ) : isError ? (
          <ErrorState
            title="Couldn't load attendance data"
            subtitle="Check your connection and try again."
            onRetry={() => refetch()}
          />
        ) : (
          <>
            <View className="mx-4 mb-3 bg-white rounded-2xl border border-gray-100 p-4">
              <Text className="text-xs font-semibold text-gray-400 tracking-wide">
                TODAY&apos;S MARKING COVERAGE
              </Text>

              <View className="flex-row items-baseline mt-1">
                <Text className="text-4xl font-extrabold text-gray-900">
                  {coverage?.percentage ?? 0}%
                </Text>
                <Text className="text-sm text-gray-400 ml-2">
                  {coverage?.marked ?? 0} of {coverage?.totalStudents ?? 0} students
                </Text>
              </View>

              <View className="h-2 rounded-full bg-gray-100 mt-3 overflow-hidden">
                <View
                  className="h-full rounded-full"
                  style={{
                    width: `${Math.min(100, Math.max(0, coverage?.percentage ?? 0))}%`,
                    backgroundColor: '#2563EB',
                  }}
                />
              </View>

              {unmarked > 0 && (
                <View className="flex-row items-center gap-2 mt-3">
                  <Feather name="alert-circle" size={14} color="#D97706" />
                  <Text className="text-xs font-semibold text-amber-700">
                    {unmarked} student{unmarked > 1 ? 's' : ''} still unmarked
                    today
                  </Text>
                </View>
              )}
            </View>

            <MonthlyAttendanceGrid
              year={monthYear}
              month={month}
              calendarDays={calendarDays ?? []}
              attendance={[]}
              onPrevMonth={goPrevMonth}
              onNextMonth={goNextMonth}
              disableNext={disableNext}
            />

            <View className="px-4 mt-5 mb-2">
              <Text className="text-base font-semibold text-gray-900">
                Upcoming Events
              </Text>
            </View>

            {events.length === 0 ? (
              <View className="mx-4">
                <EmptyState
                  icon="calendar"
                  title="Nothing on the calendar ahead"
                  subtitle="Holidays and events will show up here."
                />
              </View>
            ) : (
              <View className="mx-4 bg-white rounded-2xl border border-gray-100 overflow-hidden">
                {events.map((event, idx) => (
                  <View
                    key={`${toISODate(event.date)}-${idx}`}
                    className={`flex-row items-center justify-between px-4 py-3 ${
                      idx !== events.length - 1 ? 'border-b border-gray-100' : ''
                    }`}
                  >
                    <Text className="text-[15px] font-medium text-gray-900 flex-1 mr-2">
                      {event.label ?? event.type}
                    </Text>
                    <Text className="text-xs text-gray-400 mr-3">
                      {event.date.toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </Text>
                    <View
                      className="rounded-full px-2 py-0.5"
                      style={{
                        backgroundColor: DAY_CHIP_COLOR[event.type] + '1A',
                      }}
                    >
                      <Text
                        className="text-[11px] font-semibold"
                        style={{ color: DAY_CHIP_COLOR[event.type] }}
                      >
                        {event.type}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            <Text className="px-4 mt-4 text-xs text-gray-400 leading-4">
              Marking attendance for a section is a Teacher action. This screen
              shows school-wide coverage only.
            </Text>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

export default Admin;
