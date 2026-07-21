import { z } from 'zod';

export const assessmentCategoryEnum = z.enum([
  'UnitTest',
  'MidTerm',
  'FinalTheory',
  'FinalPractical',
  'Internal',
]);

const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  hasPractical: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

const assessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: assessmentCategoryEnum,
  subjectId: z.string(),
  sectionId: z.string(),
  maxMarks: z.number(),
  date: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  subject: subjectSchema,
});

export const markSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  assessmentId: z.string(),
  marksObtained: z.number(),
  remarks: z.string().nullable(),
  enteredById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  assessment: assessmentSchema,
});

export const markArraySchema = z.array(markSchema);

export type Mark = z.infer<typeof markSchema>;
export type MarkArray = z.infer<typeof markArraySchema>;
export type AssessmentCategory = z.infer<typeof assessmentCategoryEnum>;