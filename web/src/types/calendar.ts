import { z } from 'zod';

/**
 * Mirrors the Prisma `DayType` enum (`AcademicCalendarDay.type`).
 *
 * `Weekend` is stored, not derived — the school decides which days are
 * weekends by generating the calendar — so the five values are the whole set.
 */
export const dayTypeSchema = z.enum([
  'Working',
  'Holiday',
  'Exam',
  'Event',
  'Weekend',
]);
export type DayType = z.infer<typeof dayTypeSchema>;
