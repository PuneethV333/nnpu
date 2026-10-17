import { z } from 'zod';

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  /** Marked out of theory + practical. Shown as a marker in the pickers. */
  hasPractical: z.boolean(),
});

export const subjectArraySchema = z.array(subjectSchema);

export type Subject = z.infer<typeof subjectSchema>;
export type SubjectArray = z.infer<typeof subjectArraySchema>;
