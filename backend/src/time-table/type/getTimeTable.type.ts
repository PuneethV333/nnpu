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
  }[];
}

export interface TimetableDayType {
  day: Week;
  slots: TimetableSlotType[];
}
