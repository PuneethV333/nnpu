import { z } from 'zod';

export const RoleSchema = z.enum(['Student', 'Teacher', 'Admin']);
export type Role = z.infer<typeof RoleSchema>;

export const LoginResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    role: RoleSchema,
  }),
});
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const RefreshResponseSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type RefreshResponse = z.infer<typeof RefreshResponseSchema>;

const ProfileDetailsSchema = z.object({
  name: z.string(),
  profilePic: z.string().nullable(),
  email: z.string(),
});

const ProfileSchoolSchema = z.object({
  /**
   * Optional on purpose — same reasoning as the app's copy of this schema. It
   * is what the manual create-student form sends as `schoolId`, and making it
   * required would fail this parse against a backend that predates the field.
   * A failed `/auth/me` clears the session, so an over-strict schema here logs
   * everyone out.
   */
  id: z.string().optional(),
  name: z.string(),
  noOfStudents: z.number().optional(),
  noOfTeacher: z.number().optional(),
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
  source: z.enum(['redis', 'db']).optional(),
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
export type CurrentUser = MeResponse['data'];
