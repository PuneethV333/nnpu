import { z } from "zod";

export const TimetableOptionSchema = z.object({
  subject: z.string(),
  teacher: z.string().nullable(),
  language: z.string().nullable(),
  combination: z.string().nullable(),
});

export const TimetableSlotSchema = z.object({
  periodId: z.string(),
  order: z.number().int(),
  startTime: z.string(),
  endTime: z.string(),
  isBreak: z.boolean(),
  label: z.string().nullable(),
  options: z.array(TimetableOptionSchema),
});

export const TimetableDaySchema = z.object({
  day: z.enum([
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
  ]),
  slots: z.array(TimetableSlotSchema),
});

export const TimetableSchema = z.array(TimetableDaySchema);

// Types
export type TimetableOptionType = z.infer<typeof TimetableOptionSchema>;
export type TimetableSlotType = z.infer<typeof TimetableSlotSchema>;
export type TimetableDayType = z.infer<typeof TimetableDaySchema>;
export type TimetableType = z.infer<typeof TimetableSchema>;