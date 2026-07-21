import React,{ useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProgressCard from '@/components/attendance-page/ProgressCard';
import MonthlyAttendanceGrid from '@/components/attendance-page/MonthlyAttendanceGrid';
import { dummyCalendarDays, dummyMonthAttendance, dummyMonthlyRate, dummyYearlyRate } from '@/constants/dummy/calendarDummy';


const AttendanceMonthlyPage = () => {
  const [year, setYear] = useState(2026);
  const [month, setMonth] = useState(6); // July, 0-indexed

  const goPrev = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const today = new Date();
  const disableNext =
    year > today.getFullYear() ||
    (year === today.getFullYear() && month >= today.getMonth());

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingVertical: 16 }}>
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
          year={year}
          month={month}
          calendarDays={dummyCalendarDays}
          attendance={dummyMonthAttendance}
          onPrevMonth={goPrev}
          onNextMonth={goNext}
          disableNext={disableNext}
        />
      </ScrollView>
    </SafeAreaView>
  );
};

export default AttendanceMonthlyPage;