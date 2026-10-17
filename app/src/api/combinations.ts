import { combinationArraySchema, type CombinationArray } from '@/src/types/combination';
import { api } from './client';

export const getCombinations = async (): Promise<CombinationArray> => {
  return combinationArraySchema.parse((await api.get('/combinations')).data);
};
