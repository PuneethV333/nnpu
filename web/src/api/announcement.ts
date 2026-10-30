import { api } from '@/lib/apiClient';
import {
  latestAnnouncementsResponseSchema,
  type LatestAnnouncement,
} from '@/types/announcement';

/**
 * `GET /announcement/latest` — the five newest announcements visible to the
 * signed-in user. The server already scopes them to their audience (Global,
 * their school, or their section) and returns `{ data, source }`; callers only
 * ever want `data`.
 */
export const getLatestAnnouncements = async (): Promise<
  LatestAnnouncement[]
> => {
  const res = await api.get('/announcement/latest');
  return latestAnnouncementsResponseSchema.parse(res.data).data;
};
