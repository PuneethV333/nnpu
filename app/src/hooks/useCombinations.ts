import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getCombinations } from '../api/combinations';

/**
 * The combination catalogue, for the manual create-student picker.
 *
 * Read-only and stable, so the default `staleTime` is fine — the server does not
 * cache it, and there is no write path to invalidate.
 */
export const useGetCombinations = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['combinations'],
    queryFn: getCombinations,
    enabled: isAuthenticated && (role === 'Admin' || role === 'Teacher'),
  });
};
