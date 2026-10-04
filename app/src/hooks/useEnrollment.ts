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

// Every /enrollment/* route on the controller is `@Roles('Admin')`, so gate
// these on role as well as auth — otherwise a Student/Teacher session fires
// requests that can only ever 403.
export const useListDrives = () => {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'drives'],
    queryFn: listDrives,
    enabled: isAuthenticated && role === 'Admin',
  });
};

export const useGetDrive = (id: string) => {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'drive', id],
    queryFn: () => getDrive(id),
    enabled: isAuthenticated && role === 'Admin' && !!id,
  });
};

export const useListSubmissions = (driveId: string, status?: string) => {
  const { isAuthenticated, role } = useAuth();
  return useQuery({
    queryKey: ['enrollment', 'submissions', driveId, status],
    queryFn: () => listSubmissions(driveId, status),
    enabled: isAuthenticated && role === 'Admin' && !!driveId,
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
