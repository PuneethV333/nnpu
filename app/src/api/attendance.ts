import { getMySchema, GetMyType } from '@/src/types/attendance';
import { api } from './client';

export const getAttendance = async (
  from: string,
  to: string,
): Promise<GetMyType> => {
  return getMySchema.parse(
    (await api.get('/attendance/get-me', { params: { from, to } })).data,
  );
};