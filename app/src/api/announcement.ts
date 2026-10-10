import {
  latestListResponseSchema,
  detailResponseSchema,
  latestSchema,
  deleteAnnouncementResponseSchema,
  type CreateAnnouncementBody,
  type UpdateAnnouncementBody,
  type DeleteAnnouncementResponse,
  type Latest,
} from '../types/announcement';
import { api } from './client';

export const latest = async (): Promise<Latest[]> => {
  const res = await api.get('/announcement/latest');
  return latestListResponseSchema.parse(res.data).data;
};

export const details = async (id: string): Promise<Latest> => {
  const res = await api.get(`/announcement/${id}`);
  return detailResponseSchema.parse(res.data).data;
};

export const allAnnouncements = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<{ data: Latest[] }> => {
  const res = await api.get('/announcement/all', { params: { page, pageSize } });
  return { data: latestListResponseSchema.parse(res.data).data };
};

/**
 * Admin-only on the server (`@Roles('Admin')`), throttled to 20/min.
 *
 * Answers with the same `latest` projection as the read routes — the author
 * name is resolved server-side from the caller's token, not from a body field.
 */
export const createAnnouncement = async (
  body: CreateAnnouncementBody,
): Promise<Latest> => {
  const res = await api.post('/announcement', body);
  return latestSchema.parse(res.data);
};

export const updateAnnouncement = async (
  id: string,
  body: UpdateAnnouncementBody,
): Promise<Latest> => {
  const res = await api.patch(`/announcement/${id}`, body);
  return latestSchema.parse(res.data);
};

/** Returns 200 with a confirmation payload, not 204 — nothing to unwrap. */
export const deleteAnnouncement = async (
  id: string,
): Promise<DeleteAnnouncementResponse> => {
  const res = await api.delete(`/announcement/${id}`);
  return deleteAnnouncementResponseSchema.parse(res.data);
};
