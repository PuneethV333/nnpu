// ASSUMED — dayTypeEnum / CalendarDay were referenced (used in
// admin-dashboard.ts) but not pasted. Guessed enum values from your doc's
// "Working/Holiday/Event chip" line. Verify against the real
// types/calendar.ts and merge with the existing dayTypeEnum export instead
// of importing this file if the real one already has these values.
import { z } from "zod";

export const dayTypeEnum = z.enum(["Working", "Holiday", "Weekend", "Event", "Exam"]);
export type DayType = z.infer<typeof dayTypeEnum>;

export const calendarDaySchema = z.object({
  date: z.coerce.date(),
  type: dayTypeEnum,
  label: z.string().nullable(),
});
export type CalendarDay = z.infer<typeof calendarDaySchema>;
