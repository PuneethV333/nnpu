import { z } from 'zod';

export const dayTypeEnum = z.enum(['Working', 'Holiday', 'Exam', 'Event', 'Weekend']);
export type DayType = z.infer<typeof dayTypeEnum>;

export const calendarDaySchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  type: dayTypeEnum,
  label: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const calendarDayArraySchema = z.array(calendarDaySchema);

export const calendarRangeResponseSchema = z.object({
  data: calendarDayArraySchema,
  source: z.enum(['db', 'redis']),
});

export const generateCalendarSchema = z.object({
  year: z.number().int(),
  overrides: z.array(
    z.object({
      date: z.string(),
      type: dayTypeEnum,
      label: z.string().optional(),
    }),
  ),
});

export const generateCalendarResponseSchema = z.object({
  message: z.string(),
  totalDays: z.number(),
});

export const overrideDaySchema = z.object({
  date: z.string(),
  type: dayTypeEnum,
  label: z.string().optional(),
});

export const overrideDayResponseSchema = calendarDaySchema;

export type CalendarDay = z.infer<typeof calendarDaySchema>;
export type CalendarDayArray = z.infer<typeof calendarDayArraySchema>;
export type CalendarRangeResponse = z.infer<typeof calendarRangeResponseSchema>;
export type GenerateCalendar = z.infer<typeof generateCalendarSchema>;
export type GenerateCalendarResponse = z.infer<typeof generateCalendarResponseSchema>;
export type OverrideDay = z.infer<typeof overrideDaySchema>;
