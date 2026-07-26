import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  createDrive,
  listDrives,
  getDrive,
  listSubmissions,
  promoteSubmission,
  promoteAll,
} from '../api/enrollment';

export const useCreateDrive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['enrollment', 'create-drive'],
    mutationFn: createDrive,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment', 'drives'] });
    },
  });
};

export const useListDrives = () => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'drives'],
    queryFn: listDrives,
    enabled: isAuthenticated,
  });
};

export const useGetDrive = (id: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'drive', id],
    queryFn: () => getDrive(id),
    enabled: isAuthenticated && !!id,
  });
};

export const useListSubmissions = (driveId: string, status?: string) => {
  const { isAuthenticated } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'submissions', driveId, status],
    queryFn: () => listSubmissions(driveId, status),
    enabled: isAuthenticated && !!driveId,
  });
};

export const usePromoteSubmission = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['enrollment', 'promote'],
    mutationFn: promoteSubmission,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });
};

export const usePromoteAll = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['enrollment', 'promote-all'],
    mutationFn: promoteAll,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });
};
