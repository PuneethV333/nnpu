import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getMyMarks } from '../api/marks';

export const useGetMyMarks = (subjectId?: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['my-marks', subjectId],
    queryFn: () => getMyMarks(subjectId),
    enabled: isAuthenticated,
  });
};