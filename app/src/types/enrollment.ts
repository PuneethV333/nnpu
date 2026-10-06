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