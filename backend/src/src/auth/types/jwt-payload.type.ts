import { z } from 'zod';

export const JwtPayloadSchema = z.object({
  authId: z.string(),
  role: z.enum(['Student', 'Teacher', 'Admin']),
  jti: z.string(),
  tokenVersion: z.number(),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
