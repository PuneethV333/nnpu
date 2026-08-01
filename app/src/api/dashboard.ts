import { adminDashboardSchema, type AdminDashboard } from '@/src/types/dashboard';
import { api } from './client';

export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  return adminDashboardSchema.parse((await api.get('/dashboard/admin')).data);
};
