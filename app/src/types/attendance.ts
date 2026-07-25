import { z } from "zod";

export const attendanceSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  sectionId: z.string(),
  date: z.coerce.date(),
  status: z.enum(["Absent", "Late", "NotMarked", "Present"]),
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

export const summarySchema = z.object({
  from: z.string(),
  to: z.string(),
  workingDays: z.number(),
  present: z.number(),
  absent: z.number(),
  late: z.number(),
  notMarked: z.number(),
  percentage: z.number(),
})

export const mySummarySchema = z.object({
  data: summarySchema,
  source: z.enum(['redis', 'db'])
})

export type mySummaryType = z.infer<typeof mySummarySchema>


export const rosterItemSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  sectionId: z.string(),
  date: z.coerce.date(),
  status: z.enum(["NotMarked", "Present", "Absent", "Late"]),
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


export const MarkEntrySchema = z.object({
  studentId: z.string(),
  status: z.enum(["NotMarked", "Present", "Absent", "Late"]),
})


export const MarkAttendanceSchema = z.object({
  sectionId: z.string(),
  date: z.string(),
  entries: z.array(MarkEntrySchema),
})

export type MarkAttendanceType = z.infer<typeof MarkAttendanceSchema>

export const statusSchema = z.object({
  isMarked: z.boolean(),
  isLocked: z.boolean(),
  markedAt: z.coerce.date().nullable(),
})

export type statusType = z.infer<typeof statusSchema>