import React,{useState} from 'react';
import { View, Text, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AttendanceRow from '@/components/attendance-page/AttendanceRow';
import SummaryCard from '@/components/attendance-page/SummaryCard';
import WeekNavigator from '@/components/attendance-page/WeekNavigator';
import { formatRangeLabel, getWeekDays, getWeekRange, toISODate } from '@/src/libs/week';
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


const USE_DUMMY = true; // flip to false once backend is wired

const AttendancePage = () => {
  const [weekOffset, setWeekOffset] = useState(0);

  const { monday, saturday } = getWeekRange(weekOffset);
  const from = toISODate(monday);
  const to = toISODate(saturday);
  const weekDays = getWeekDays(monday); // 6 Date objects, Mon..Sat

  const { data, isLoading, isError } = useGetMyAttendance(from, to);
  const attendance = USE_DUMMY ? dummyAttendance : data;

  // match each Mon-Sat day to its record, if any
  const recordByDate = new Map(
    (attendance ?? []).map((a) => [toISODate(a.date), a]),
  );

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <Text className="text-2xl inter_bold text-gray-900 px-4 pt-4 pb-3">
        My Attendance
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
        <ScrollView showsVerticalScrollIndicator={false}>
          <SummaryCard data={attendance} />

          <View className="mx-4 mt-4 bg-white rounded-2xl border border-gray-100">
            {weekDays.map((day) => (
              <AttendanceRow
                key={toISODate(day)}
                date={day}
                record={recordByDate.get(toISODate(day)) ?? null}
              />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default AttendancePage;