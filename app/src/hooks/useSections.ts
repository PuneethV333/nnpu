import {
  useMutation,
  useQueries,
  useQuery,
  useQueryClient,
  type QueryObserverResult,
} from '@tanstack/react-query';
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
  SectionAssignments,
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


export type TeacherOption = { id: string; name: string };

/**
 * There is no "list teachers" endpoint, so the staffing pickers are fed from
 * the only place teacher ids appear: the assignments payloads. This reads the
 * same `['section-assignments', id]` keys as `useGetSectionAssignments`, so
 * every section already viewed is free and the rest are fetched once.
 *
 * Known gap: a teacher who is not class teacher or subject teacher anywhere yet
 * cannot appear here. A `GET /users?role=Teacher` would remove the gap.
 *
 * `combine` is module-level so its identity is stable across renders.
 */
const combineTeacherPool = (
  results: QueryObserverResult<SectionAssignments>[],
) => {
  const byId = new Map<string, string>();
  let isLoading = false;

  results.forEach((r) => {
    if (r.isLoading) isLoading = true;
    const d = r.data;
    if (!d) return;
    if (d.classTeacher?.name) byId.set(d.classTeacher.id, d.classTeacher.name);
    d.subjects.forEach((s) => {
      if (s.teacherId && s.teacherName) byId.set(s.teacherId, s.teacherName);
    });
  });

  const teachers: TeacherOption[] = Array.from(byId, ([id, name]) => ({
    id,
    name,
  })).sort((a, b) => a.name.localeCompare(b.name));

  return { teachers, isLoading };
};

export const useGetTeacherPool = (sectionIds: string[]) => {
  const { isAuthenticated, role } = useAuth();

  return useQueries({
    queries: sectionIds.map((sectionId) => ({
      queryKey: ['section-assignments', sectionId],
      queryFn: () => getSectionAssignments(sectionId),
      enabled: isAuthenticated && role === 'Admin' && !!sectionId,
    })),
    combine: combineTeacherPool,
  });
};
