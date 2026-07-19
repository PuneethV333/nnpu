import { TimetableSchema, TimetableType } from "../types/timeTable";
import { api } from "./client";

export const getTimeTable = async ():Promise<TimetableType> => {
  return TimetableSchema.parse((await api.get('/time-table')).data)
}