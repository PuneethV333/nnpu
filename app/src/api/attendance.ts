import { z } from 'zod';
import { getMySchema, GetMyType, MarkAttendanceType, mySummarySchema, mySummaryType, rosterSchema, RosterType, statusSchema, statusType } from '@/src/types/attendance';
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

export const roster = async (sectionId: string, date: string): Promise<RosterType> => {
  return rosterSchema.parse((await api.get('/attendance/roster', { params: { sectionId, date } })).data)
}

const markAttendanceResponseSchema = z.object({ message: z.string() });

export const markAttendance = async (body: MarkAttendanceType): Promise<{ message: string }> => {
  return markAttendanceResponseSchema.parse((await api.post('/attendance/mark', body)).data);
}

export const checkStatus = async (sectionId: string, date: string): Promise<statusType> => {
  return statusSchema.parse((await api.get('/attendance/status', { params: { sectionId, date } })).data)
}