import { z } from 'zod';

export const assessmentCategoryEnum = z.enum([
  'UnitTest',
  'MidTerm',
  'FinalTheory',
  'FinalPractical',
  'Internal',
]);

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  hasPractical: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const assessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: assessmentCategoryEnum,
  subjectId: z.string(),
  sectionId: z.string(),
  maxMarks: z.number(),
  date: z.coerce.date().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  /**
   * Optional, and the asymmetry is the backend's, not a guess.
   *
   * `GET /marks/me` (a student's own marks) includes the relation, because it
   * returns Mark rows with `include: { assessment: { include: { subject } } }`.
   * `GET /marks/assessment` (the teacher's list) returns bare Assessment rows
   * and has no relation loaded.
   *
   * This field was previously required, which meant the teacher's list threw
   * on every successful response — the Zod parse failed inside queryFn, so the
   * whole screen died rather than rendering. Optional because of that; the
   * student views that do render a subject name are unaffected.
   */
  subject: subjectSchema.optional(),
});

/**
 * One recorded mark row, as returned for an assessment.
 *
 * Separate from `markSchema` because the student's `/marks/me` payload nests
 * the full assessment (with its subject) under `assessment`, whereas this
 * endpoint returns the mark rows on their own.
 */
export const assessmentMarkSchema = z.object({
  id: z.string(),
  studentId: z.string(),
  assessmentId: z.string(),
  marksObtained: z.number(),
  remarks: z.string().nullable(),
  enteredById: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const assessmentMarkArraySchema = z.array(assessmentMarkSchema);
export type AssessmentMark = z.infer<typeof assessmentMarkSchema>;
export type AssessmentMarkArray = z.infer<typeof assessmentMarkArraySchema>;

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

export const createAssessmentSchema = z.object({
  name: z.string(),
  subjectId: z.string(),
  sectionId: z.string(),
  date: z.string().optional(),
  category: assessmentCategoryEnum,
  maxMarks: z.number(),
})

export const markEntrySchema = z.object({
  studentId: z.string(),
  marksObtained: z.number(),
  remarks: z.string().optional(),
})

export const enterMarksSchema = z.object({
  assessmentId: z.string(),
  entries: z.array(markEntrySchema)
})


export const AssessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: assessmentCategoryEnum,
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

export const mySubjectSchema = z.object({
  name: z.string(),
  hasPractical: z.boolean(),
  id: z.string(),
})

export const mySubjectsSchema = z.array(mySubjectSchema)

export const pendingAssessmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  category: assessmentCategoryEnum,
  subjectName: z.string(),
});

export const pendingAssessmentArraySchema = z.array(pendingAssessmentSchema);

export type Mark = z.infer<typeof markSchema>;
export type MarkArray = z.infer<typeof markArraySchema>;
export type AssessmentCategory = z.infer<typeof assessmentCategoryEnum>;
export type createAssessmentType = z.infer<typeof createAssessmentSchema>;
export type assessmentType = z.infer<typeof assessmentSchema>
export type markEntryType = z.infer<typeof markEntrySchema>
export type enterMarksType = z.infer<typeof enterMarksSchema>
export type SubjectResultType = z.infer<typeof SubjectResultSchema>;
export type mySubjectType = z.infer<typeof mySubjectSchema>;
export type mySubjectsType = z.infer<typeof mySubjectsSchema>;
export type PendingAssessment = z.infer<typeof pendingAssessmentSchema>;
export type PendingAssessmentArray = z.infer<typeof pendingAssessmentArraySchema>;