import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getAllSections, getMySections } from '../api/sections';

export const useGetMySections = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['my-sections'],
    queryFn: getMySections,
    enabled: isAuthenticated && role === 'Teacher',
  });
};

export const useGetAllSections = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['all-sections'],
    queryFn: getAllSections,
    enabled: isAuthenticated && (role === 'Teacher' || role === 'Admin'),
  });
};
