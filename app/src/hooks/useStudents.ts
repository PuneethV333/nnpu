import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getStudents } from '../api/auth';

export const useGetStudents = (sectionId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['students', sectionId],
    queryFn: () => getStudents(sectionId),
    enabled: isAuthenticated && (role === 'Admin' || role === 'Teacher') && !!sectionId && sectionId !== '', 
  });
};