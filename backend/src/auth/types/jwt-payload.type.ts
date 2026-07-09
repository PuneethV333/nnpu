import { z } from 'zod';

export const JwtPayloadSchema = z.object({
  authId: z.string(),
  role: z.enum(['Student', 'Teacher', 'Admin']),
});

export type JwtPayload = z.infer<typeof JwtPayloadSchema>;
