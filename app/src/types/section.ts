import { z } from 'zod';

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z.string(),
  className: z.string(),
  academicYearLabel: z.string(),
  /**
   * Start year of the academic year, as a 4-digit number (2026 for "2026-27").
   *
   * The CSV import requires the caller to state which year it is importing
   * into, and the server rejects a mismatch. Deriving it here from the section
   * — rather than asking the admin to type it and risk a mismatch — is why
   * this is on the section payload instead of parsed out of the label.
   */
  academicYearStart: z.number(),
  isClassTeacher: z.boolean(),
});

export const sectionArraySchema = z.array(sectionSchema);

export type Section = z.infer<typeof sectionSchema>;
export type SectionArray = z.infer<typeof sectionArraySchema>;
