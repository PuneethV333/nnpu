import { z } from 'zod';

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z.string(),
  className: z.string(),
  academicYearLabel: z.string(),
  academicYearStart: z.number(),
  /**
   * The section's own academic year, so callers do not have to reconstruct it
   * from the label. Fee structure is keyed by (section, academicYear) and no
   * endpoint lists academic years, so without this the fees screen cannot
   * resolve a structure at all — and making the admin pick a year the section
   * already determines is a mismatch waiting to happen.
   */
  academicYearId: z.string(),
  isClassTeacher: z.boolean(),
});

export const sectionArraySchema = z.array(sectionSchema);

export type SectionDto = z.infer<typeof sectionSchema>;
export type SectionArray = z.infer<typeof sectionArraySchema>;
