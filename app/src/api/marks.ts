import { markArraySchema, MarkArray } from '@/src/types/marks';
import { api } from './client';

export const getMyMarks = async (subjectId?: string): Promise<MarkArray> => {
  return markArraySchema.parse(
    (await api.get('/marks/me', { params: subjectId ? { subjectId } : {} })).data,
  );
};