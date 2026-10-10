import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
    // Without a staleTime every query is stale the instant it resolves, so
    // switching tabs and back refetched the roster and flashed a spinner over
    // data that had not changed. Marking still invalidates this key on
    // success, so a real edit is reflected immediately — the cache is not
    // being trusted past a save, only past a tab switch.
    staleTime: 30_000,
  })
}

export const useCheckStatus = (sectionId: string, date: string) => {
  const { isAuthenticated,role } = useAuth()
  return useQuery({
    queryKey: ['status',date,sectionId],
    queryFn: () => checkStatus(sectionId,date),
    enabled: isAuthenticated && role === 'Teacher',
    // Same reasoning as the roster: the locked/marked banners should not
    // flicker while switching tabs. Invalidated on every successful mark.
    staleTime: 30_000,
  })
}

export const useMarkAttendance = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationKey:['mark-attendance'],
    mutationFn:markAttendance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['roster'] })
      queryClient.invalidateQueries({ queryKey: ['status'] })
      queryClient.invalidateQueries({ queryKey: ['my-attendance'] })
      queryClient.invalidateQueries({ queryKey: ['summary'] })
    },
  })
}

