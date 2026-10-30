import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { BootScreen } from '@/components/BootScreen';

/**
 * Route guard for every signed-in screen.
 *
 * The redirect carries the page that was asked for, so a link into a deep
 * page can come back to it after sign-in instead of dumping the user on the
 * dashboard.
 */
export const RequireAuth = () => {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <BootScreen />;

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return <Outlet />;
};
