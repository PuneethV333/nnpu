import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMyNotifications,
  markNotificationRead,
  registerDeviceToken,
} from '../api/notification';

export const useGetNotifications = () => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
    enabled: isAuthenticated,
  });
};

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};

export const useRegisterDevice = () => {
  return useMutation({
    mutationFn: registerDeviceToken,
  });
};