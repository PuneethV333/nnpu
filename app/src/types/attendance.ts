import { z } from "zod";

// export const attendanceSummerySchema = z.object({
//   data: z.object({
//         from:z.coerce.date(),
//         to:z.coerce.date(),
//         workingDays: z.number(),
//         present: z.number(),
//         absent: z.number(),
//         late: z.number(),
//         notMarked: z.number(),
//         percentage: z.number(),
//     }),
//     source: z.enum(["db","redis"])
// })

// export type attendanceSummery = z.infer<typeof attendanceSummerySchema>

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