import { z } from "zod";

export const notificationTypeEnum = z.enum([
  'AttendancePending',
  'AttendanceUpdated',
  'MarksPublished',
  'NewAnnouncement',
  'TimetableUpdated',
  'FeeDue',
  'PaymentSuccessful',
]);

export const notificationSchema = z.object({
  id: z.string(),
  userId: z.string(),
  type: notificationTypeEnum,
  title: z.string(),
  body: z.string(),
  isRead: z.boolean(),
  createdAt: z.coerce.date(),
})

export const notificationArraySchema = z.array(notificationSchema);

export type Notification = z.infer<typeof notificationSchema>;
export type NotificationArray = z.infer<typeof notificationArraySchema>;

export const platformEnum = z.enum(['android', 'ios']);

export const registerDeviceSchema = z.object({
  token: z.string(),
  platform: platformEnum,
});

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;