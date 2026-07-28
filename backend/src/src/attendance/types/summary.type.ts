import { z } from 'zod';

export const AttendanceSummarySchema = z.object({
  from: z.string(),
  to: z.string(),
  workingDays: z.number(),
  present: z.number(),
  absent: z.number(),
  late: z.number(),
  notMarked: z.number(),
  percentage: z.number(),
});

export type AttendanceSummary = z.infer<typeof AttendanceSummarySchema>;
