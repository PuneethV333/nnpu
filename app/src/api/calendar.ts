import {
  calendarRangeResponseSchema,
  generateCalendarResponseSchema,
  overrideDayResponseSchema,
  type CalendarDayArray,
  type GenerateCalendar,
  type GenerateCalendarResponse,
  type CalendarDay,
} from '@/src/types/calendar';
import { api } from './client';

export const getCalendarRange = async (
  from: string,
  to: string,
): Promise<CalendarDayArray> => {
  const res = await api.get('/calendar', { params: { from, to } });
  return calendarRangeResponseSchema.parse(res.data).data;
};

export const generateCalendar = async (
  body: GenerateCalendar,
): Promise<GenerateCalendarResponse> => {
  const res = await api.post('/calendar/generate', body);
  return generateCalendarResponseSchema.parse(res.data);
};

export const overrideDay = async (
  date: string,
  type: string,
  label?: string,
): Promise<CalendarDay> => {
  const res = await api.post(`/calendar/day/${date}/override`, { type, label });
  return overrideDayResponseSchema.parse(res.data);
};
