import {
  School,
  schoolSchema,
  CreateStudentType,
  CreatedUser,
  createdUserSchema,
  CreateStaffType,
  CreateAcademicYearType,
  AcademicYear,
  academicYearSchema,
  CreateSectionType,
  Section,
  sectionSchema,
  CreateSectionsBulkType,
  CreateSectionsBulkResultType,
  createSectionsBulkResultSchema,
} from '@/src/types/onboarding';
import { api } from './client';

export const createSchool = async (name: string): Promise<School> => {
  return schoolSchema.parse((await api.post('/onboarding/create-school', { name })).data);
};

export const createStudent = async (body: CreateStudentType): Promise<CreatedUser> => {
  return createdUserSchema.parse((await api.post('/onboarding/create-student', body)).data);
};

export const createTeacher = async (body: CreateStaffType): Promise<CreatedUser> => {
  return createdUserSchema.parse((await api.post('/onboarding/create-teacher', body)).data);
};

export const createAdmin = async (body: CreateStaffType): Promise<CreatedUser> => {
  return createdUserSchema.parse((await api.post('/onboarding/create-admin', body)).data);
};

export const createAcademicYear = async (body: CreateAcademicYearType): Promise<AcademicYear> => {
  return academicYearSchema.parse((await api.post('/onboarding/create-academic-year', body)).data);
};

export const createSection = async (body: CreateSectionType): Promise<Section> => {
  return sectionSchema.parse((await api.post('/onboarding/create-section', body)).data);
};

export const createSectionsBulk = async (body: CreateSectionsBulkType): Promise<CreateSectionsBulkResultType> => {
  return createSectionsBulkResultSchema.parse((await api.post('/onboarding/create-sections-bulk', body)).data);
};