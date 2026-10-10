import { z } from 'zod';

export const streamEnum = z.enum(['Science', 'Commerce']);
export type Stream = z.infer<typeof streamEnum>;

export const secondLanguageEnum = z.enum(['Kannada', 'Hindi', 'Sanskrit']);
export type SecondLanguage = z.infer<typeof secondLanguageEnum>;

export const importedStudentSchema = z.object({
  name: z.string(),
  email: z.string(),
  authId: z.string(),
});

export const skippedStudentSchema = z.object({
  line: z.number(),
  name: z.string(),
  reason: z.string(),
});

export const importStudentsResponseSchema = z.object({
  created: z.array(importedStudentSchema),
  skipped: z.array(skippedStudentSchema),
  emailed: z.number(),
  emailFailed: z.number(),
});

export type ImportStudentsResponse = z.infer<
  typeof importStudentsResponseSchema
>;

/**
 * One CSV into one session.
 *
 * `sectionId` is the session, `year` is asserted against that session's
 * academic year on the server (it can only agree or disagree — it is not a
 * filter), and `file` is the multipart body.
 */
export interface ImportStudentsBody {
  sectionId: string;
  year: number;
  file: {
    uri: string;
    name: string;
    type: string;
  };
}
/**
 * Students left behind in a source section, with the reason.
 *
 * Always worth rendering. A promotion that moves 118 of 120 is not a
 * successful 118 — it is 118 moved and 2 that need a human decision, and a UI
 * that only shows `moved` hides the second half.
 */
export const promotionSkippedSchema = z.object({
  name: z.string(),
  reason: z.string(),
});

export const promotionSectionResultSchema = z.object({
  sourceSectionId: z.string(),
  sourceName: z.string(),
  targetSectionId: z.string(),
  targetName: z.string(),
  /** True when the target section did not exist and had to be created. */
  targetCreated: z.boolean(),
  studentsToMove: z.number(),
  skipped: z.array(promotionSkippedSchema),
});

export const promoteTo2ndPucResponseSchema = z.object({
  dryRun: z.boolean(),
  targetAcademicYearId: z.string(),
  targetAcademicYearLabel: z.string(),
  moved: z.number(),
  sections: z.array(promotionSectionResultSchema),
});

export type PromoteTo2ndPucResponse = z.infer<
  typeof promoteTo2ndPucResponseSchema
>;

/**
 * Body for `POST /enrollment/promote-2nd-puc`.
 *
 * Sections are explicit rather than "all 1st-PUC": this is a cohort-wide,
 * one-way move, so the admin must be able to hold one section back without the
 * endpoint offering a way to half-apply a batch.
 *
 * `targetAcademicYearId` omitted means "the year after the source sections'",
 * created if absent. `dryRun` reports the same counts and the same
 * `(would be created)` target ids without writing — including the target
 * academic year, which is created as a side effect of a real run.
 */
export interface PromoteTo2ndPucBody {
  sections: { sectionId: string }[];
  targetAcademicYearId?: string;
  dryRun?: boolean;
}
