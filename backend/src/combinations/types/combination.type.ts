import { z } from 'zod';

export const combinationSchema = z.object({
  id: z.string(),
  stream: z.enum(['Science', 'Commerce']),
  /** The short label shown in the UI, e.g. "PCMC". */
  code: z.string(),
  /**
   * The value `createStudent` expects as `subjectCode`.
   *
   * Distinct from `code` on purpose: they happen to match for the seeded rows,
   * but the create path looks up `Combination.idCode`, not `code`, so the form
   * has to send this one.
   */
  idCode: z.string(),
  name: z.string(),
});

export const combinationArraySchema = z.array(combinationSchema);

export type CombinationDto = z.infer<typeof combinationSchema>;
export type CombinationArray = z.infer<typeof combinationArraySchema>;
