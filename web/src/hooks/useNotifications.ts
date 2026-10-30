import { useQuery } from '@tanstack/react-query';
import { getMyNotifications } from '@/api/notification';
import { useAuth } from '@/hooks/useAuth';

/**
 * The signed-in user's notifications.
 *
 * The shell only needs one fact from this — whether anything is unread — but
 * it asks for the list rather than a count because there is no count endpoint,
 * and the full row is what a notification panel will need next.
 */
export const useNotifications = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
    enabled: isAuthenticated,
    staleTime: 30_000,
  });
};
