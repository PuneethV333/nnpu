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

export const MeResponseSchema = z.object({
  source: z.enum(["redis", "db"]).optional(),
  data: z.object({
    id: z.string(),
    role: RoleSchema,
    isActive: z.boolean(),
    schoolId: z.string().nullable().optional(),
    sectionId: z.string().nullable().optional(),
    details: z
      .object({
        name: z.string(),
        profilePic: z.string(),
      })
      .nullable()
      .optional(),
  }),
});
export type MeResponse = z.infer<typeof MeResponseSchema>;
export type CurrentUser = MeResponse["data"];