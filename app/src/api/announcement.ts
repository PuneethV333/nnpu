import {
  latestListResponseSchema,
  detailResponseSchema,
  type Latest,
} from '../types/announcement';
import { api } from './client';

export const latest = async (): Promise<Latest[]> => {
  const res = await api.get('announcement/latest');
  return latestListResponseSchema.parse(res.data).data;
};

export const details = async (id: string): Promise<Latest> => {
  const res = await api.get(`announcement/${id}`);
  return detailResponseSchema.parse(res.data).data;
};

export const allAnnouncements = async (
  page: number = 1,
  pageSize: number = 10,
): Promise<{ data: Latest[] }> => {
  const res = await api.get('announcement/all', { params: { page, pageSize } });
  return { data: latestListResponseSchema.parse(res.data).data };
};
