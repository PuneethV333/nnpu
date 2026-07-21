import { z } from 'zod';

export const dayTypeEnum = z.enum(['Working', 'Holiday', 'Exam', 'Event', 'Weekend']);

export const calendarDaySchema = z.object({
  id: z.string(),
  date: z.coerce.date(),
  type: dayTypeEnum,
  label: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const calendarDayArraySchema = z.array(calendarDaySchema);

export type CalendarDay = z.infer<typeof calendarDaySchema>;
export type CalendarDayArray = z.infer<typeof calendarDayArraySchema>;