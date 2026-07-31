import { sectionArraySchema, type SectionArray } from '@/src/types/section';
import { api } from './client';

export const getMySections = async (): Promise<SectionArray> => {
  return sectionArraySchema.parse((await api.get('/sections/mine')).data);
};

export const getAllSections = async (): Promise<SectionArray> => {
  return sectionArraySchema.parse((await api.get('/sections')).data);
};
