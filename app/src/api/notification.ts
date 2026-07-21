import {
  notificationArraySchema,
  NotificationArray,
  RegisterDeviceInput,
} from '@/src/types/notification';
import { api } from './client';

export const getMyNotifications = async (): Promise<NotificationArray> => {
  return notificationArraySchema.parse((await api.get('/notification')).data);
};

export const markNotificationRead = async (id: string): Promise<void> => {
  await api.patch(`/notification/${id}/read`);
};

export const registerDeviceToken = async (
  input: RegisterDeviceInput,
): Promise<void> => {
  await api.post('/notification/register-device', input);
};