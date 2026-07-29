import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getAllSections } from '../api/sections';

export const useGetAllSections = () => {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['sections', 'all'],
    queryFn: getAllSections,
    enabled: isAuthenticated && (role === 'Teacher' || role === 'Admin'),
  });
};