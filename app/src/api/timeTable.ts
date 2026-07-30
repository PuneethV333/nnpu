import { TimetableSchema, TimetableType, TimetableDaySchema, TimetableDayType } from "../types/timeTable";
import { api } from "./client";

export const getTimeTable = async ():Promise<TimetableType> => {
  return TimetableSchema.parse((await api.get('/time-table')).data)
}

export const getTodaysTimeTable = async (): Promise<TimetableDayType | null> => {
  const res = (await api.get('/time-table/todays')).data;
  if (res === null) return null;
  return TimetableDaySchema.parse(res);
};