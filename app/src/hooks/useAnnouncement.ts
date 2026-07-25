import { useQuery } from '@tanstack/react-query';
import { allAnnouncements, details, latest } from '../api/announcement';
import { useAuth } from './useAuth';

export const useGetLatest = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: latest,
    enabled: isAuthenticated,
  });
};

export const useGetAnnouncementDetails = (id: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'detail', id],
    queryFn: () => details(id),
    enabled: isAuthenticated && !!id,
  });
};

export const useGetAnnouncements = (page: number = 1, pageSize: number = 10) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'all', page, pageSize],
    queryFn: () => allAnnouncements(page, pageSize),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
};
