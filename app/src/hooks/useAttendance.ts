import { useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { getAttendance } from '../api/attendance';

export const useGetMyAttendance = (from: string, to: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['my-attendance', from, to],
    queryFn: () => getAttendance(from, to),
    select: (res) => res.data,
    enabled: isAuthenticated && !!from && !!to,
  });
};

