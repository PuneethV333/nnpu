import { calendarDayArraySchema, CalendarDayArray } from '@/src/types/calendar';
import { api } from './client';

export const getCalendarRange = async (
  from: string,
  to: string,
): Promise<CalendarDayArray> => {
  return calendarDayArraySchema.parse((await api.get('/calendar', { params: { from, to } })).data);
};