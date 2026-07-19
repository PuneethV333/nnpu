import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getTimeTable } from "../api/timeTable";

export const useGetTimeTable = () => {
  const {isAuthenticated} = useAuth()
  return useQuery({
    queryKey:['time-table'],
    queryFn:getTimeTable,
    enabled:isAuthenticated,
  })
}