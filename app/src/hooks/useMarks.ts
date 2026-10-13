import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMyMarks,
  createAssessment,
  getAssessments,
  enterMarks,
  getFinalReport,
  getMySubjects,
  getAssessmentMarks,
  getPendingAssessments,
} from '../api/marks';

export const useGetMyMarks = (subjectId?: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['my-marks', subjectId],
    queryFn: () => getMyMarks(subjectId),
    enabled: isAuthenticated,
  });
};

export const useGetAssessments = (sectionId: string, subjectId?: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['assessments', sectionId, subjectId],
    queryFn: () => getAssessments(sectionId, subjectId),
    enabled: isAuthenticated && (role === 'Teacher' || role === 'Admin') && !!sectionId,
  });
};

/**
 * Marks already saved for one assessment.
 *
 * Keyed by assessment id alone rather than section+subject so switching
 * between two assessments of the same subject doesn't refetch the first one's
 * marks.
 */
export const useGetAssessmentMarks = (assessmentId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['assessment-marks', assessmentId],
    queryFn: () => getAssessmentMarks(assessmentId),
    enabled: isAuthenticated && !!assessmentId &&
      (role === 'Teacher' || role === 'Admin'),
    staleTime: 30_000,
  });
};

export const useCreateAssessment = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createAssessment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
    },
  });
};

export const useEnterMarks = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: enterMarks,
    onSuccess: () => {
      // Entering marks creates the Mark rows for an assessment. The query a
      // teacher/Admin reads next is the assessment list (and a student's
      // pending/final report), so those are what must refetch. `my-marks` is
      // invalidated too so a Student on another screen doesn't show a stale
      // total.
      queryClient.invalidateQueries({ queryKey: ['assessments'] });
      // The saved marks this read returns are now stale — the teacher is
      // looking at what they just submitted.
      queryClient.invalidateQueries({ queryKey: ['assessment-marks'] });
      queryClient.invalidateQueries({ queryKey: ['pending-assessments'] });
      queryClient.invalidateQueries({ queryKey: ['final-report'] });
      queryClient.invalidateQueries({ queryKey: ['my-marks'] });
    },
  });
};

export const useGetFinalReport = (studentId: string, subjectId: string) => {
  const { isAuthenticated } = useAuth();

  return useQuery({
    queryKey: ['final-report', studentId, subjectId],
    queryFn: () => getFinalReport(studentId, subjectId),
    enabled: isAuthenticated && !!studentId && !!subjectId,
  });
};

export const useGetMySubjects = (sectionId: string) => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['my-subjects', sectionId],
    queryFn: () => getMySubjects(sectionId),
    enabled: isAuthenticated && (role === 'Teacher' || role === 'Admin') && !!sectionId,
  });
};

export const useGetPendingAssessments = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['pending-assessments'],
    queryFn: getPendingAssessments,
    enabled: isAuthenticated && role === 'Student',
  });
};