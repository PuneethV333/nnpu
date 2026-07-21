export type DayCellStatus = 'Present' | 'Absent' | 'Late' | 'Holiday' | 'Weekend' | 'Future' | 'NoData';

interface DayCell {
  day: number;
  date: Date;
  status: DayCellStatus;
  disabled: boolean;
}

export const getMonthGrid = (
  year: number,
  month: number, // 0-indexed, matches JS Date
  calendarDays: { date: Date; type: string }[],
  attendance: { date: Date; status: string }[],
): DayCell[] => {
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const calendarByDay = new Map(
    calendarDays.map((c) => [c.date.getUTCDate(), c.type]),
  );
  const attendanceByDay = new Map(
    attendance.map((a) => [a.date.getUTCDate(), a.status]),
  );

  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    const date = new Date(Date.UTC(year, month, day));
    const calType = calendarByDay.get(day);
    const attStatus = attendanceByDay.get(day);

    let status: DayCellStatus = 'NoData';
    let disabled = false;

    if (date > today) {
      status = 'Future';
      disabled = true;
    } else if (calType === 'Holiday') {
      status = 'Holiday';
      disabled = true;
    } else if (calType === 'Weekend') {
      status = 'Weekend';
      disabled = true;
    } else if (attStatus === 'Present' || attStatus === 'Late') {
      status = 'Present';
    } else if (attStatus === 'Absent') {
      status = 'Absent';
    } else {
      status = 'NoData';
      disabled = true;
    }

    return { day, date, status, disabled };
  });
};

// leading blank cells so day 1 aligns under the correct weekday column (Sun-start grid)
export const getLeadingBlankCount = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 1)).getUTCDay();