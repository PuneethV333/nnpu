import { DayType } from '@/generated/prisma';
import { z } from 'zod';

export const rangeSchema = z.object({
  id: z.string(),
  date: z.date(),
  type: z.enum(DayType),
  label: z.string().nullable(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type range = z.infer<typeof rangeSchema>;
