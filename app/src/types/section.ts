import { z } from 'zod';

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z.string(),
  className: z.string(),
  academicYearLabel: z.string(),
  isClassTeacher: z.boolean(),
});

export const sectionArraySchema = z.array(sectionSchema);

export type Section = z.infer<typeof sectionSchema>;
export type SectionArray = z.infer<typeof sectionArraySchema>;
