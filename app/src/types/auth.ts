import { z } from "zod";

export const RoleSchema = z.enum(["Student", "Teacher", "Admin"]);
export type Role = z.infer<typeof RoleSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    role: RoleSchema,
  }),
})

export type LoginResponse = z.infer<typeof LoginResponseSchema>;

const ProfileDetailsSchema = z.object({
  name: z.string(),
  profilePic: z.string().nullable(),
  email: z.string(),
});

const ProfileSchoolSchema = z.object({
  /**
   * Optional on purpose. It is what the manual create-student form sends as
   * `schoolId`, but making it required would fail this parse against a backend
   * that predates the field — and a failed `/auth/me` clears the session, so an
   * app built ahead of its server would log everyone out. The form instead
   * treats a missing id as "cannot submit yet".
   */
  id: z.string().optional(),
  name: z.string(),
  noOfStudents: z.number().optional(),
  noOfTeacher: z.number().optional(),
  // The API returns null here: User has no gender field, so these are omitted
  // rather than faked. Callers must handle null.
  noOfBoys: z.number().nullable().optional(),
  noOfGirls: z.number().nullable().optional(),
});

const ProfileClassSchema = z.object({
  name: z.string(),
});

const ProfileClassTeacherSchema = z.object({
  details: z.object({ name: z.string() }).nullable(),
});

const ProfileSectionSchema = z.object({
  name: z.string(),
  session: z.string(),
  class: ProfileClassSchema.nullable(),
  classTeacher: ProfileClassTeacherSchema.nullable(),
});

const ProfileCombinationSchema = z.object({
  name: z.string(),
  stream: z.string(),
});

const ProfileTeachingSubjectSchema = z.object({
  subject: z.object({ name: z.string() }),
  section: z.object({
    name: z.string(),
    class: ProfileClassSchema.nullable(),
  }),
});

const ProfileClassTeacherOfSchema = z.object({
  name: z.string(),
  class: ProfileClassSchema.nullable(),
});

export const MeResponseSchema = z.object({
  source: z.enum(["redis", "db"]).optional(),
  data: z.object({
    id: z.string(),
    role: RoleSchema,
    isActive: z.boolean(),
    details: ProfileDetailsSchema.nullable(),
    school: ProfileSchoolSchema.nullable(),
    section: ProfileSectionSchema.nullable(),
    combination: ProfileCombinationSchema.nullable(),
    language: z.string().nullable(),
    teachingSubjects: z.array(ProfileTeachingSubjectSchema),
    classTeacherOf: ProfileClassTeacherOfSchema.nullable(),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type CurrentUser = MeResponse["data"];