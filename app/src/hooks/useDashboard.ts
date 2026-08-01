import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getAdminDashboard } from '../api/dashboard';

export const useGetAdminDashboard = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: getAdminDashboard,
    enabled: isAuthenticated && role === 'Admin',
  });
};
