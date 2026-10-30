import { z } from 'zod';

/**
 * Mirrors the Prisma `AnnouncementTypes` enum.
 *
 * The API sends the enum value, not a label — "TimetableUpdate" is what the
 * dashboard's badge maps to the word "Timetable" (`lib/announcementType.ts`).
 */
export const announcementTypeSchema = z.enum([
  'Holiday',
  'TimetableUpdate',
  'ResultUpdate',
  'Normal',
]);
export type AnnouncementType = z.infer<typeof announcementTypeSchema>;

/**
 * One row of `GET /announcement/latest`.
 *
 * This is the server's `latest` projection, not the full record: it carries
 * the author's display name and picture instead of an author id, so the card
 * needs no second request. `profilePic` is `z.string()` and not nullable
 * because `toLatest()` coalesces a missing picture to `''` — see
 * `announcement.service.ts`.
 */
export const latestAnnouncementSchema = z.object({
  id: z.string(),
  name: z.string(),
  title: z.string(),
  body: z.string(),
  type: announcementTypeSchema,
  profilePic: z.string(),
});
export type LatestAnnouncement = z.infer<typeof latestAnnouncementSchema>;

export const latestAnnouncementsResponseSchema = z.object({
  data: z.array(latestAnnouncementSchema),
  source: z.enum(['db', 'redis']),
});
export type LatestAnnouncementsResponse = z.infer<
  typeof latestAnnouncementsResponseSchema
>;
