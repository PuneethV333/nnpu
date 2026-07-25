import { getMySchema, GetMyType, mySummarySchema, mySummaryType } from '@/src/types/attendance';
import { api } from './client';

export const getAttendance = async (
  from: string,
  to: string,
): Promise<GetMyType> => {
  return getMySchema.parse(
    (await api.get('/attendance/get-me', { params: { from, to } })).data,
  );
};

export const getMySummary = async (from: string,
  to: string,): Promise<mySummaryType> => {
  return mySummarySchema.parse((await api.get('/attendance/summary', { params: { from, to } })).data)
}

export const roster = async (sectionId: string,date: string)  => {
  
}