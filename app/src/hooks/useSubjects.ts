import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getSubjects } from '../api/subjects';

/**
 * The subject catalogue.
 *
 * The only way a subject used to reach the client was inside a section's
 * assignments, so a screen that needed to name one outside any section — the
 * create-teacher form — had nothing to offer.
 *
 * Read-only and stable, so the default `staleTime` is fine: nothing but a seed
 * or a migration writes `Subject`, and the server deliberately does not cache it.
 */
export const useGetSubjects = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['subjects'],
    queryFn: getSubjects,
    enabled: isAuthenticated && (role === 'Admin' || role === 'Teacher'),
  });
};
