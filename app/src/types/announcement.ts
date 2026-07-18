
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
