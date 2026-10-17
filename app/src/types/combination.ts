import { z } from 'zod';

export const combinationSchema = z.object({
  id: z.string(),
  stream: z.enum(['Science', 'Commerce']),
  /** The short label shown in the picker, e.g. "PCMC". */
  code: z.string(),
  /** The value `POST /onboarding/create-student` expects as `subjectCode`. */
  idCode: z.string(),
  name: z.string(),
});

export const combinationArraySchema = z.array(combinationSchema);

export type Combination = z.infer<typeof combinationSchema>;
export type CombinationArray = z.infer<typeof combinationArraySchema>;
