import { Week } from '@/generated/prisma';

export interface TimetableSlotType {
  periodId: string;
  order: number;
  startTime: string;
  endTime: string;
  isBreak: boolean;
  label: string | null;
  options: {
    subject: string;
    teacher: string | null;
    language: string | null;
    combination: string | null;
    /**
     * The section the lesson is taught in, e.g. "1-SCI-A". Populated only on the
     * teacher's own timetable, where the useful detail is *where* to go; it is
     * `null` on the student view (they are already in that section).
     */
    section: string | null;
  }[];
}

export interface TimetableDayType {
  day: Week;
  slots: TimetableSlotType[];
}
