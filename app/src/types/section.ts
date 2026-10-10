import { z } from 'zod';

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z.string(),
  className: z.string(),
  academicYearLabel: z.string(),
  /**
   * Start year of the academic year, as a 4-digit number (2026 for "2026-27").
   *
   * The CSV import requires the caller to state which year it is importing
   * into, and the server rejects a mismatch. Deriving it here from the section
   * — rather than asking the admin to type it and risk a mismatch — is why
   * this is on the section payload instead of parsed out of the label.
   */
  academicYearStart: z.number(),
  isClassTeacher: z.boolean(),
});

export const sectionArraySchema = z.array(sectionSchema);

export type Section = z.infer<typeof sectionSchema>;
export type SectionArray = z.infer<typeof sectionArraySchema>;

/**
 * Who teaches a subject in this section, and who is class teacher.
 *
 * `teacherId`/`teacherName` are nullable: a subject can be in a section with
 * nobody staffed to it yet, which is the normal state before a term starts and
 * not an error.
 */
export const sectionSubjectAssignmentSchema = z.object({
  subjectId: z.string(),
  subjectName: z.string(),
  hasPractical: z.boolean(),
  teacherId: z.string().nullable(),
  teacherName: z.string().nullable(),
});

export const sectionClassTeacherSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
});

export const sectionAssignmentsSchema = z.object({
  sectionId: z.string(),
  sectionName: z.string(),
  session: z.string(),
  classTeacher: sectionClassTeacherSchema.nullable(),
  subjects: z.array(sectionSubjectAssignmentSchema),
});

export type SectionAssignments = z.infer<typeof sectionAssignmentsSchema>;
export type SectionSubjectAssignment = z.infer<
  typeof sectionSubjectAssignmentSchema
>;

/**
 * Response of `PATCH /sections/:id/class-teacher`.
 *
 * Deliberately thin — the server selects only these two columns rather than
 * re-serialising the section. Read `/sections/mine` afterwards for the
 * `isClassTeacher` flag, which flips on the affected teacher's side.
 */
export const setClassTeacherResponseSchema = z.object({
  id: z.string(),
  classTeacherId: z.string().nullable(),
});
export type SetClassTeacherResponse = z.infer<
  typeof setClassTeacherResponseSchema
>;

/** Body for `PATCH /sections/:id/class-teacher`. `null` unstaffs the section. */
export interface SetClassTeacherBody {
  teacherId: string | null;
}

/**
 * Body for `POST /sections/:id/subjects`.
 *
 * This is a replace, not a merge — the server upserts each `subjectId` and does
 * not clear subjects absent from the list. Send the complete set the section
 * should have.
 */
export interface AssignSubjectsBody {
  assignments: {
    subjectId: string;
    /** `null` keeps the subject in the section with nobody teaching it. */
    teacherId: string | null;
  }[];
}
