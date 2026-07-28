import { AttendanceStatus } from '@/generated/prisma';
import { z } from 'zod';

export const rosterItemSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  sectionId: z.string(),
  date: z.coerce.date(),
  status: z.enum(AttendanceStatus),
  markedById: z.string().nullable(),
  markedAt: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  name: z.string().nullable().optional(),
  profilePic: z.string().nullable().optional(),
});

export const rosterArraySchema = z.array(rosterItemSchema);

export const rosterSchema = z.object({
  data: rosterArraySchema,
  source: z.enum(['db', 'redis']),
});

export type RosterItem = z.infer<typeof rosterItemSchema>;
export type RosterArray = z.infer<typeof rosterArraySchema>;
export type RosterType = z.infer<typeof rosterSchema>;
