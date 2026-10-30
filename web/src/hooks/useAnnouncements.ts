import { useQuery } from '@tanstack/react-query';
import { getLatestAnnouncements } from '@/api/announcement';
import { useAuth } from '@/hooks/useAuth';

export const useLatestAnnouncements = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: getLatestAnnouncements,
    enabled: isAuthenticated,
    // The server caches this list under an audience-scoped key and invalidates
    // it on every create/update/delete, so a short client-side hold is safe.
    staleTime: 30_000,
  });
};
