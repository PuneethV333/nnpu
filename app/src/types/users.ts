import { z } from 'zod';

/**
 * `POST /users/:userId/activate` and `/deactivate` share one response shape.
 *
 * `unchanged: true` means the user was already in the requested state and no
 * write happened — not an error. Surfacing it matters because deactivate also
 * revokes sessions, and telling an admin "deactivated" when nothing changed
 * invites them to keep clicking.
 */
export const setActiveResponseSchema = z.object({
  userId: z.string(),
  isActive: z.boolean(),
  unchanged: z.boolean(),
});
export type SetActiveResponse = z.infer<typeof setActiveResponseSchema>;

export const transferStudentResponseSchema = z.object({
  studentId: z.string(),
  fromSectionId: z.string(),
  toSectionId: z.string(),
  name: z.string().nullable(),
});
export type TransferStudentResponse = z.infer<
  typeof transferStudentResponseSchema
>;

/** Body for `POST /users/:studentId/transfer`. */
export interface TransferStudentBody {
  sectionId: string;
}

/**
 * `POST /users/:userId/reset-password`.
 *
 * `emailedTo` is nullable rather than omitted: the server skips the email when
 * the account has no address on file, and a UI that renders
 * "credentials emailed to null" is worse than one that can branch to "email
 * not sent — no address on file".
 */
export const resetPasswordResponseSchema = z.object({
  userId: z.string(),
  authId: z.string(),
  emailedTo: z.string().nullable(),
});
export type ResetPasswordResponse = z.infer<
  typeof resetPasswordResponseSchema
>;

/**
 * `PATCH /users/me/profile-pic`.
 *
 * The server echoes the URL it stored rather than the whole profile: `/auth/me`
 * is the one description of the current user, and returning a second, partial
 * one here invites two screens to disagree about which is current. The app
 * refreshes the profile after this resolves.
 */
export const updateProfilePicResponseSchema = z.object({
  userId: z.string(),
  profilePic: z.string(),
});
export type UpdateProfilePicResponse = z.infer<
  typeof updateProfilePicResponseSchema
>;

/**
 * One teacher as `/users/teachers` reports them.
 *
 * `name` is nullable because it lives on the separate `PersonalDetails` row — a
 * teacher account without one still appears rather than vanishing from the
 * picker. `subjectIds` are the subjects recorded against the teacher, which the
 * picker uses to mark who was recorded as teaching the subject being staffed.
 */
export const teacherRefSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  subjectIds: z.array(z.string()),
});

export const teacherListSchema = z.array(teacherRefSchema);

export type TeacherRef = z.infer<typeof teacherRefSchema>;
export type TeacherList = z.infer<typeof teacherListSchema>;

/**
 * A teacher as the pickers consume one: always with a name to render, sort and
 * filter on. The null case is resolved once, at the hook boundary, rather than
 * in every row that draws a name.
 */
export type TeacherOption = { id: string; name: string; subjectIds: string[] };

export const passOutSectionResultSchema = z.object({
  sectionId: z.string(),
  sectionName: z.string(),
  passedOut: z.number(),
});
export type PassOutSectionResult = z.infer<typeof passOutSectionResultSchema>;

export const passOutResponseSchema = z.object({
  dryRun: z.boolean(),
  deactivated: z.number(),
  sections: z.array(passOutSectionResultSchema),
  /**
   * Staff attached to a passing-out cohort, reported rather than deactivated.
   *
   * A section id is also a valid `Section.classTeacherId`, so a section can be
   * "passed out" that has a teacher on staff. The server refuses to deactivate
   * them — this list is how the admin finds out why the count is lower than
   * they expected.
   */
  classTeachersUntouched: z.array(z.string()),
});
export type PassOutResponse = z.infer<typeof passOutResponseSchema>;

/**
 * Body for `POST /users/pass-out`.
 *
 * `sections` is many because a graduating cohort is passed out together once
 * the year closes; `reason` is logged server-side only and never stored.
 * `dryRun` reports the same counts without writing or revoking sessions.
 */
export interface PassOutBody {
  sections: { sectionId: string }[];
  reason?: string;
  dryRun?: boolean;
}