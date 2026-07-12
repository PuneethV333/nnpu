import { Role } from '@/generated/prisma/enums';
import { z } from 'zod';

export const loginSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
  user: z.object({
    id: z.string(),
    role: z.enum(Role),
  }),
});

export type login = z.infer<typeof loginSchema>;
