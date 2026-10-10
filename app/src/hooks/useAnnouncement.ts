import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  allAnnouncements,
  createAnnouncement,
  deleteAnnouncement,
  details,
  latest,
  updateAnnouncement,
} from '../api/announcement';
import type {
  CreateAnnouncementBody,
  UpdateAnnouncementBody,
} from '../types/announcement';
import { useAuth } from './useAuth';

export const useGetLatest = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'latest'],
    queryFn: latest,
    enabled: isAuthenticated,
  });
};

export const useGetAnnouncementDetails = (id: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'detail', id],
    queryFn: () => details(id),
    enabled: isAuthenticated && !!id,
  });
};

export const useGetAnnouncements = (page: number = 1, pageSize: number = 10) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['announcements', 'all', page, pageSize],
    queryFn: () => allAnnouncements(page, pageSize),
    select: (res) => res.data,
    enabled: isAuthenticated,
  });
};

/**
 * Admin-only writes.
 *
 * Every one of these invalidates all three announcement reads because the
 * server resolves audience server-side from the caller's school and section:
 * creating a `Section`-scoped post changes what `latest` should return for that
 * section's students, not just for the admin who posted it.
 */
const useInvalidateAnnouncements = () => {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ['announcements'] });
};

export const useCreateAnnouncement = () => {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationKey: ['announcements', 'create'],
    mutationFn: (body: CreateAnnouncementBody) => createAnnouncement(body),
    onSuccess: invalidate,
  });
};

export const useUpdateAnnouncement = () => {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationKey: ['announcements', 'update'],
    mutationFn: ({ id, body }: { id: string; body: UpdateAnnouncementBody }) =>
      updateAnnouncement(id, body),
    onSuccess: invalidate,
  });
};

export const useDeleteAnnouncement = () => {
  const invalidate = useInvalidateAnnouncements();
  return useMutation({
    mutationKey: ['announcements', 'delete'],
    mutationFn: (id: string) => deleteAnnouncement(id),
    onSuccess: invalidate,
  });
};
