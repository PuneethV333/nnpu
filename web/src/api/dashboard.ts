import { api } from '@/lib/apiClient';
import { adminDashboardSchema, type AdminDashboard } from '@/types/dashboard';

/**
 * `GET /dashboard/admin` — Admin only.
 *
 * The response is parsed before it is returned: this is the project's runtime
 * type boundary, the same as every other api function. A shape change should
 * fail here, with the payload in the error, rather than surface as `undefined`
 * rendered inside a stat card.
 */
export const getAdminDashboard = async (): Promise<AdminDashboard> => {
  const res = await api.get('/dashboard/admin');
  return adminDashboardSchema.parse(res.data);
};
