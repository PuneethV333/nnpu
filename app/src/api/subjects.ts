import { subjectArraySchema, type SubjectArray } from '@/src/types/subject';
import { api } from './client';

export const getSubjects = async (): Promise<SubjectArray> => {
  return subjectArraySchema.parse((await api.get('/subjects')).data);
};
