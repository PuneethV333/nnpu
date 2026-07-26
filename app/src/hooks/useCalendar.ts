import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getCalendarRange,
  generateCalendar,
  overrideDay,
} from '../api/calendar';

export const useGetRange = (from: string, to: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['calendar', 'range', from, to],
    queryFn: () => getCalendarRange(from, to),
    enabled: isAuthenticated && !!from && !!to,
  });
};

export const useGenerateCalendar = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['calendar', 'generate'],
    mutationFn: generateCalendar,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};

export const useOverrideDay = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['calendar', 'override'],
    mutationFn: ({ date, type, label }: { date: string; type: string; label?: string }) =>
      overrideDay(date, type, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar'] });
    },
  });
};
