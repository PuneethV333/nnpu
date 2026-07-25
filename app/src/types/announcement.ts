import { z } from 'zod';

export const latestSchema = z.object({
  name: z.string(),
  title: z.string(),
  type: z.enum(['Holiday', 'TimetableUpdate', 'ResultUpdate', 'Normal']),
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
