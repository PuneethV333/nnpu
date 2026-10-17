import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  assignSubjects,
  getAllSections,
  getMySections,
  getSectionAssignments,
  setClassTeacher,
} from '../api/sections';
import type {
  AssignSubjectsBody,
  SetClassTeacherBody,
} from '../types/section';

export const useGetMySections = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['my-sections'],
    queryFn: getMySections,
    enabled: isAuthenticated && role === 'Teacher',
  });
};

export const useGetAllSections = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['all-sections'],
    queryFn: getAllSections,
    enabled: isAuthenticated && (role === 'Teacher' || role === 'Admin'),
  });
};

export const useGetSectionAssignments = (sectionId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['section-assignments', sectionId],
    queryFn: () => getSectionAssignments(sectionId),
    enabled: isAuthenticated && !!sectionId && (role === 'Teacher' || role === 'Admin'),
  });
};

/**
 * Staffing writes.
 *
 * All three invalidate `all-sections` as well as the assignments query. The
 * server invalidates its own Redis copy of `/sections/mine` (it owns those
 * teachers), but this client's cached section list still carries a stale
 * `isClassTeacher`, which is what drives the tab bar's class-teacher-only
 * views — so a teacher promoted mid-session would not see their new section
 * until a manual refetch.
 */
const useInvalidateSectionState = () => {
  const queryClient = useQueryClient();
  return (sectionId: string) => {
    queryClient.invalidateQueries({ queryKey: ['section-assignments', sectionId] });
    queryClient.invalidateQueries({ queryKey: ['all-sections'] });
    queryClient.invalidateQueries({ queryKey: ['my-sections'] });
    // Assigning a subject rewrites who teaches it, which is exactly what
    // `my-subjects` is. Without this, staffing a teacher onto a subject and
    // then opening Marks shows the pre-staffing list. The backend clears its
    // own Redis copy; this is the client's.
    queryClient.invalidateQueries({ queryKey: ['my-subjects'] });
  };
};

export const useSetClassTeacher = () => {
  const invalidate = useInvalidateSectionState();
  return useMutation({
    mutationKey: ['sections', 'set-class-teacher'],
    mutationFn: ({ sectionId, body }: { sectionId: string; body: SetClassTeacherBody }) =>
      setClassTeacher(sectionId, body),
    onSuccess: (_res, vars) => invalidate(vars.sectionId),
  });
};

export const useAssignSubjects = () => {
  const invalidate = useInvalidateSectionState();
  return useMutation({
    mutationKey: ['sections', 'assign-subjects'],
    mutationFn: ({ sectionId, body }: { sectionId: string; body: AssignSubjectsBody }) =>
      assignSubjects(sectionId, body),
    onSuccess: (_res, vars) => invalidate(vars.sectionId),
  });
};

