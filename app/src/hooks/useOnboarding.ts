import { useMutation } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  createSchool,
  createStudent,
  createTeacher,
  createAdmin,
  createAcademicYear,
  createSection,
  createSectionsBulk,
} from '../api/onboarding';

export const useCreateSchool = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createSchool,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateStudent = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createStudent,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateTeacher = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createTeacher,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateAdmin = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createAdmin,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateAcademicYear = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createAcademicYear,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateSection = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createSection,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};

export const useCreateSectionsBulk = () => {
  const { isAuthenticated, role } = useAuth();

  return useMutation({
    mutationFn: createSectionsBulk,
    meta: { guarded: isAuthenticated && role === 'Admin' },
  });
};