import { api } from '@/lib/apiClient';
import {
  notificationListSchema,
  type Notification,
} from '@/types/notification';

/**
 * `GET /notification` — the signed-in user's own notifications.
 *
 * This endpoint answers with a bare array, unlike the `/announcement/*` and
 * `/calendar` reads, which wrap theirs in `{ data, source }`. The cache
 * envelope is a per-service choice on the server, so the client has to follow
 * each one rather than assume one shape.
 */
export const getMyNotifications = async (): Promise<Notification[]> => {
  const res = await api.get('/notification');
  return notificationListSchema.parse(res.data);
};
