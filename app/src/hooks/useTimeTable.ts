import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getTimeTable, getTodaysTimeTable } from "../api/timeTable";

export const useGetTimeTable = () => {
  const {isAuthenticated} = useAuth()
  return useQuery({
    queryKey:['time-table'],
    queryFn:getTimeTable,
    enabled:isAuthenticated,
  })
}

export const useGetTodaysTimeTable = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['time-table', 'todays'],
    queryFn: getTodaysTimeTable,
    enabled: isAuthenticated,
  });
};