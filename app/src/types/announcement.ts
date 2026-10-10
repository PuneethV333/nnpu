import { z } from 'zod';

/**
 * Mirrors the Prisma `AnnouncementTypes` enum.
 *
 * Named rather than inlined, because it appears in three places — the read
 * payload, the create body and the update body — and an inline copy in each is
 * how a renamed enum value ends up typechecked but rejected at runtime by the
 * Zod parse.
 */
export const announcementTypeEnum = z.enum([
  'Holiday',
  'TimetableUpdate',
  'ResultUpdate',
  'Normal',
]);
export type AnnouncementType = z.infer<typeof announcementTypeEnum>;

/**
 * Who an announcement is addressed to. Determines how the server scopes it:
 * Global -> everyone, School -> the author's own school, Section -> one section.
 */
export const announcementAudienceEnum = z.enum([
  'Global',
  'School',
  'Section',
]);
export type AnnouncementAudience = z.infer<typeof announcementAudienceEnum>;

export const latestSchema = z.object({
  name: z.string(),
  title: z.string(),
  type: announcementTypeEnum,
  body: z.string(),
  profilePic: z.string(),
  id: z.string(),
});

export type Latest = z.infer<typeof latestSchema>;
export type latest = Latest;

const sourceEnum = z.enum(['db', 'redis']);

export const latestListResponseSchema = z.object({
  data: z.array(latestSchema),
  source: sourceEnum,
});

export type LatestListResponse = z.infer<typeof latestListResponseSchema>;

export const detailResponseSchema = z.object({
  data: latestSchema,
  source: sourceEnum,
});

export type DetailResponse = z.infer<typeof detailResponseSchema>;

/**
 * Body for `POST /announcement`.
 *
 * `sectionId` is required by the server only when `audience` is `Section`;
 * sending it for another audience is rejected by the server's target
 * resolution, so it stays optional here rather than being a discriminated
 * union the form cannot easily produce.
 */
export interface CreateAnnouncementBody {
  title: string;
  body: string;
  type: AnnouncementType;
  audience: AnnouncementAudience;
  isPinned?: boolean;
  sectionId?: string;
}

/**
 * Body for `PATCH /announcement/:id`.
 *
 * Fully optional — this is a `PartialType` on the server. Note the server only
 * re-scopes the post when `audience` is present: sending `sectionId` on its own
 * is a 400, so the two must travel together.
 */
export type UpdateAnnouncementBody = Partial<CreateAnnouncementBody>;

/** Both create and update answer with the same `toLatest` projection. */
export const deleteAnnouncementResponseSchema = z.object({
  deleted: z.boolean(),
  id: z.string(),
});
export type DeleteAnnouncementResponse = z.infer<
  typeof deleteAnnouncementResponseSchema
>;
