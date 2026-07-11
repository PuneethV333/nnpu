import { AttendanceStatus } from '@/generated/prisma/enums';
import { z } from 'zod';

export const attendanceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  sectionId: z.string(),
  date: z.coerce.date(),
  status: z.enum(AttendanceStatus),
  markedById: z.string().nullable(),
});

export const attendanceArraySchema = z.array(attendanceSchema);

export const getMySchema = z.object({
  data: attendanceArraySchema,
  source: z.enum(['db', 'redis']),
});

export type Attendance = z.infer<typeof attendanceSchema>;
export type AttendanceArray = z.infer<typeof attendanceArraySchema>;
export type GetMyType = z.infer<typeof getMySchema>;
