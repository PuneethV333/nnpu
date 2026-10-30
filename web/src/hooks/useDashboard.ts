import { useQuery } from '@tanstack/react-query';
import { getAdminDashboard } from '@/api/dashboard';
import { useAuth } from '@/hooks/useAuth';

/**
 * The admin home's aggregate numbers.
 *
 * Gated on `role === 'Admin'` because `GET /dashboard/admin` is an Admin-only
 * route (`@Roles('Admin')`). Without the gate a Teacher's home would fire a
 * request that can only 403, and then render an error box for a screen they
 * are not supposed to see.
 *
 * The server keeps this endpoint deliberately uncached (see
 * `dashboard.service.ts`), so the client does not hold it for long either:
 * `staleTime` is short and a window refocus re-reads it, which is what an
 * admin expects from numbers they just changed elsewhere.
 */
export const useAdminDashboard = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['dashboard', 'admin'],
    queryFn: getAdminDashboard,
    enabled: isAuthenticated && role === 'Admin',
    staleTime: 15_000,
  });
};
