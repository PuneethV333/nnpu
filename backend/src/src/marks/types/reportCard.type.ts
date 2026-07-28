import { z } from 'zod';
import { AssessmentCategory } from '@/generated/prisma';

export const AssessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: z.enum(AssessmentCategory),
  maxMarks: z.number(),
  date: z.coerce.date().nullable(),
});

export const SubjectMarkBreakdownSchema = z.object({
  id: z.string(),
  marksObtained: z.number(),
  remarks: z.string().nullable(),
  assessment: AssessmentSchema,
});

export const SubjectResultSchema = z.object({
  studentId: z.string(),
  subjectId: z.string(),
  total: z.number(),
  maxTotal: z.number(),
  percentage: z.number(),
  breakdown: z.array(SubjectMarkBreakdownSchema),
});

export type SubjectResultDto = z.infer<typeof SubjectResultSchema>;
