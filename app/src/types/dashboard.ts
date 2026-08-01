import { z } from 'zod';
import { dayTypeEnum } from './calendar';

export const adminDashboardSchema = z.object({
  today: z.object({
    date: z.string(),
    type: dayTypeEnum.nullable(),
    label: z.string().nullable(),
  }),
  attendanceToday: z.object({
    totalStudents: z.number(),
    marked: z.number(),
    percentage: z.number(),
  }),
  pendingEnrollments: z.number(),
  openDrives: z.number(),
  fees: z.object({
    pendingInvoices: z.number(),
    amountPending: z.number(),
  }),
  upcomingEvents: z.array(
    z.object({
      date: z.coerce.date(),
      type: dayTypeEnum,
      label: z.string().nullable(),
    }),
  ),
});

export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
