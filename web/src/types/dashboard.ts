import { z } from 'zod';
import { dayTypeSchema } from './calendar';

/**
 * `GET /dashboard/admin` (Admin only, `dashboard.controller.ts`).
 *
 * Every field is required and no field is optional here on purpose: the
 * service always returns this exact shape, and a looser schema would let a
 * half-populated payload render as "0 students" instead of failing loudly.
 *
 * `fees.amountPending` is in **paise** — see `lib/money.ts`.
 */
export const adminDashboardSchema = z.object({
  today: z.object({
    /** Local calendar day, `YYYY-MM-DD`, already resolved in the school's timezone. */
    date: z.string(),
    type: dayTypeSchema.nullable(),
    label: z.string().nullable(),
  }),
  attendanceToday: z.object({
    totalStudents: z.number(),
    marked: z.number(),
    percentage: z.number(),
  }),
  totalTeachers: z.number(),
  fees: z.object({
    pendingInvoices: z.number(),
    amountPending: z.number(),
  }),
  upcomingEvents: z.array(
    z.object({
      // `@db.Date` on the server, so this arrives as `YYYY-MM-DD` and coerces
      // to a Date at UTC midnight. Format it in UTC, never in local time —
      // see `lib/date.ts`.
      date: z.coerce.date(),
      type: dayTypeSchema,
      label: z.string().nullable(),
    }),
  ),
});

export type AdminDashboard = z.infer<typeof adminDashboardSchema>;
