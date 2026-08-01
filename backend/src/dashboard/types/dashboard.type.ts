import type { DayType } from '@/generated/prisma';

export interface UpcomingCalendarEvent {
  date: Date;
  type: DayType;
  label: string | null;
}

export interface AdminDashboard {
  today: {
    /** ISO date string (YYYY-MM-DD) for the server's current UTC day */
    date: string;
    type: DayType | null;
    label: string | null;
  };
  attendanceToday: {
    totalStudents: number;
    marked: number;
    percentage: number;
  };
  pendingEnrollments: number;
  openDrives: number;
  fees: {
    pendingInvoices: number;
    amountPending: number;
  };
  upcomingEvents: UpcomingCalendarEvent[];
}
