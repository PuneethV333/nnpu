
import { z } from 'zod';

export const latestSchema = z.object({
  name: z.string(),
  title: z.string(),
  type: z.enum(['Holiday','TimetableUpdate','ResultUpdate','Normal']),
  body: z.string(),
  profilePic: z.string(),
  id: z.string(),
});

export type latest = z.infer<typeof latestSchema>;

export const allSchema = z.object({
  data:z.array(latestSchema),
  page: z.number(),
  pageSize: z.number(),
})

export type all = z.infer<typeof allSchema>;