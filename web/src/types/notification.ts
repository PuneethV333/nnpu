import { z } from 'zod';

export const notificationTypeSchema = z.enum([
  'AttendancePending',
  'AttendanceUpdated',
  'MarksPublished',
  'NewAnnouncement',
  'TimetableUpdated',
  'FeeDue',
  'PaymentSuccessful',
]);
export type NotificationType = z.infer<typeof notificationTypeSchema>;

/** `GET /notification` returns a bare array, not a `{ data }` envelope. */
export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: notificationTypeSchema,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
});
export type Notification = z.infer<typeof notificationSchema>;

export const notificationListSchema = z.array(notificationSchema);
