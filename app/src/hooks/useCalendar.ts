import { useQuery } from "@tanstack/react-query";
import { useAuth } from "./useAuth";
import { getCalendarRange } from "../api/calender";

export const useGetRange = (from:string,to:string) => {
  const {isAuthenticated} = useAuth()
  return useQuery({
    queryKey: ['get-range', from, to],
    queryFn: () => getCalendarRange(from, to),
    enabled: isAuthenticated,
  })
}