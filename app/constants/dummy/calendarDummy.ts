type DayType = 'Working' |
  'Holiday' |
  'Exam' |
  'Event' |
  'Weekend'

interface CalendarDay {
  id: string;
  date: Date;
  type: DayType;
  label: string | null;
}

// July 2026 — Wed Jul 1 is the first day; Jul 4/5 shown as weekend for illustration
const makeDay = (day: number, type: DayType, label: string | null = null): CalendarDay => ({
  id: `cal-2026-07-${day}`,
  date: new Date(Date.UTC(2026, 6, day)),
  type,
  label,
});

export const dummyCalendarDays: CalendarDay[] = [
  makeDay(1, 'Working'),
  makeDay(2, 'Working'),
  makeDay(3, 'Working'),
  makeDay(4, 'Weekend'),
  makeDay(5, 'Weekend'),
  makeDay(6, 'Working'),
  makeDay(7, 'Working'),
  makeDay(8, 'Working'),
  makeDay(9, 'Working'),
  makeDay(10, 'Working'),
  makeDay(11, 'Weekend'),
  makeDay(15, 'Holiday', 'Independence Day'),
  // ...remaining days of July would follow the same pattern in a real seed
];

interface AttendanceRecord {
  id: string;
  studentId: string;
  sectionId: string;
  date: Date;
  status: 'Present' | 'Absent' | 'Late' | 'NotMarked';
  markedById: string | null;
}

const makeAttendance = (
  day: number,
  status: AttendanceRecord['status'],
): AttendanceRecord => ({
  id: `att-2026-07-${day}`,
  studentId: 's1',
  sectionId: 'sec1',
  date: new Date(Date.UTC(2026, 6, day)),
  status,
  markedById: 't1',
});

export const dummyMonthAttendance: AttendanceRecord[] = [
  makeAttendance(1, 'Absent'),
  makeAttendance(2, 'Present'),
  makeAttendance(3, 'Present'),
  makeAttendance(6, 'Present'),
  makeAttendance(7, 'Present'),
  makeAttendance(8, 'Present'),
  makeAttendance(9, 'Present'),
  makeAttendance(10, 'Present'),
];

export const dummyMonthlyRate = { percentage: 92, label: 'July 2026' };
export const dummyYearlyRate = { percentage: 92, label: 'Current Session' };