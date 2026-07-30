import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  getMyMarks,
  createAssessment,
  getAssessments,
  enterMarks,
  getFinalReport,
  getMySubjects,
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