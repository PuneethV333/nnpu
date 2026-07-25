import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import { checkStatus, getAttendance, getMySummary, markAttendance, roster } from '../api/attendance';

export const useGetMyAttendance = (from: string, to: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['my-attendance', from, to],
    queryFn: () => getAttendance(from, to),
    select: (res) => res.data,
    enabled: isAuthenticated && !!from && !!to,
  });
};

export const useGetMySummary = (from: string, to: string) => {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: ['summary',from,to],
    queryFn: () => getMySummary(from, to),
    select: (res) => res.data,
    enabled: isAuthenticated && !!from && !!to,
  })
}

export const useGetRoster = (sectionId: string, date: string) => {
  const { isAuthenticated,role } = useAuth()
  return useQuery({
    queryKey: ['roster',sectionId,date],
    queryFn: () => roster(sectionId,date),
    select: (res) => res.data,
    enabled: isAuthenticated && role === 'Teacher',
  })
}

export const useCheckStatus = (sectionId: string, date: string) => {
  const { isAuthenticated,role } = useAuth()
  return useQuery({
    queryKey: ['status',date,sectionId],
    queryFn: () => checkStatus(sectionId,date),
    enabled: isAuthenticated && role === 'Teacher',
  })
}

export const useMarkAttendance = () => {
  // const queryClient = useQueryClient()
  return useMutation({
    mutationKey:['mark-attendance'],
    mutationFn:markAttendance,
    // onSuccess: (_data, body) => {
    //   queryClient.invalidateQueries({
    //     queryKey:['attendance']
    //   })
    // }
  })
}

