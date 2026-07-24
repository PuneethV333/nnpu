import { useQuery } from "@tanstack/react-query";
import { details, latest } from "../api/announcement";
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

export const useGetAnnouncementDetails = (id: string) => {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['get-details'],
    queryFn: () => details(id),
    retry: false,
    enabled: isAuthenticated,
  })
}

export const useGetAnnouncements = (page:number = 1,pageSize:number = 10) => {
  
}