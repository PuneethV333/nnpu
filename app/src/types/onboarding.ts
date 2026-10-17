import { z } from 'zod';

export const schoolSchema = z.object({
  id: z.string(),
  name: z.string(),
  noOfStudents: z.number(),
  noOfGirls: z.number(),
  noOfBoys: z.number(),
  noOfTeacher: z.number(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createStudentSchema = z.object({
  name: z.string().min(1),
  profilePic: z.string().optional(),
  schoolId: z.string(),
  classYear: z.enum(['1', '2']),
  subjectCode: z.string().min(1),
  language: z.enum(['Kannada', 'Hindi', 'Sanskrit']),
  session: z.string().min(1),
  /**
   * Required by the server (`CreateStudentDto`), which looks the combination up
   * by `[idCode, stream]` so a Science code can never resolve in a Commerce
   * section. The schema omitted it, so any call built from this type would have
   * failed validation.
   */
  stream: z.enum(['Science', 'Commerce']),
});

export const createStaffSchema = z.object({
  name: z.string().min(1),
  profilePic: z.string().optional(),
  schoolId: z.string(),
});

/**
 * Body for `POST /onboarding/create-teacher`.
 *
 * Separate from `createStaffSchema`, which `createAdmin` still uses: only a
 * teacher has an email to deliver the credentials to and a subject list. The
 * server stores both, and emails the login ID and the shared password.
 */
export const createTeacherSchema = createStaffSchema.extend({
  email: z.email().max(120),
  /**
   * The subjects this teacher teaches. `min(1)` because the form exists to
   * record them, and the server rejects nothing — an empty list would silently
   * create a teacher the staffing pickers cannot place. Not tied to a section:
   * a teacher exists before they are staffed anywhere.
   */
  subjectIds: z.array(z.string()).min(1),
});

export const createSchoolSchema = z.object({
  name: z.string().min(1),
});

export const createAcademicYearSchema = z.object({
  label: z.string().min(1),
  startDate: z.string(),
  endDate: z.string(),
});

export const academicYearSchema = z.object({
  id: z.string(),
  label: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createSectionSchema = z.object({
  classYear: z.enum(['1', '2']),
  session: z.string().min(1),
  academicYearId: z.string(),
});

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  classId: z.string(),
  session: z.string(),
  academicYearId: z.string(),
  classTeacherId: z.string().nullable(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const createSectionsBulkSchema = z.object({
  classYear: z.enum(['1', '2']),
  academicYearId: z.string(),
  sessions: z.array(z.string()).min(1),
});

export const createSectionsBulkResultSchema = z.object({
  message: z.string(),
  created: z.array(z.string()),
  skipped: z.array(z.string()),
});

export const createdUserSchema = z.object({
  userId: z.string(),
  authId: z.string(),
});

/**
 * Response of `POST /onboarding/create-teacher`.
 *
 * `emailedTo` names the address the credentials were sent to, and is present
 * even when the send failed — so the UI can say which address to chase rather
 * than just "no". `emailSent` is that outcome: the account is created either
 * way, so `false` is a delivery problem to report, not a failed create.
 */
export const createdTeacherSchema = createdUserSchema.extend({
  emailedTo: z.string().nullable(),
  emailSent: z.boolean(),
});

export type CreateSchoolType = z.infer<typeof createSchoolSchema>;
export type School = z.infer<typeof schoolSchema>;
export type CreateStudentType = z.infer<typeof createStudentSchema>;
export type CreateStaffType = z.infer<typeof createStaffSchema>;
export type CreateTeacherType = z.infer<typeof createTeacherSchema>;
export type CreateAcademicYearType = z.infer<typeof createAcademicYearSchema>;
export type AcademicYear = z.infer<typeof academicYearSchema>;
export type CreateSectionType = z.infer<typeof createSectionSchema>;
export type Section = z.infer<typeof sectionSchema>;
export type CreateSectionsBulkType = z.infer<typeof createSectionsBulkSchema>;
export type CreateSectionsBulkResultType = z.infer<typeof createSectionsBulkResultSchema>;
export type CreatedUser = z.infer<typeof createdUserSchema>;
export type CreatedTeacher = z.infer<typeof createdTeacherSchema>;