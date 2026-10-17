import { z } from 'zod';

export const subjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  /**
   * Whether the subject is marked out of theory + practical. Carried because the
   * staffing rows and the create-teacher picker both show it, and neither should
   * have to fetch a section's assignments to learn it.
   */
  hasPractical: z.boolean(),
});

export const subjectArraySchema = z.array(subjectSchema);

export type SubjectDto = z.infer<typeof subjectSchema>;
export type SubjectArray = z.infer<typeof subjectArraySchema>;
