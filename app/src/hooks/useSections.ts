import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getMySections } from '../api/sections';

export const useGetMySections = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['my-sections'],
    queryFn: getMySections,
    enabled: isAuthenticated && role === 'Teacher',
  });
};
