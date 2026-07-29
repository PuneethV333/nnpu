import { z } from 'zod';
import { api } from './client';

export const sectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  session: z.string(),
  className: z.string(),
  academicYearLabel: z.string(),
  isClassTeacher: z.boolean(),
});

export const sectionArraySchema = z.array(sectionSchema);
export type SectionDto = z.infer<typeof sectionSchema>;
export type SectionArray = z.infer<typeof sectionArraySchema>;

export const getAllSections = async (): Promise<SectionArray> => {
  return sectionArraySchema.parse((await api.get('/sections')).data);
};