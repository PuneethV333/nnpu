import { useQuery } from "@tanstack/react-query";
import { latest } from "../api/announcement";
import { useAuth } from "./useAuth";

export const useGetLatest = () => {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['get-latest'],
    queryFn: latest,
    retry: false,
    enabled: isAuthenticated
  })
}