import { markArraySchema, MarkArray, createAssessmentType, assessmentType, assessmentSchema, enterMarksType, SubjectResultType, SubjectResultSchema, mySubjectsType, mySubjectsSchema, pendingAssessmentArraySchema, PendingAssessmentArray } from '@/src/types/marks';
import { api } from './client';
import { z } from 'zod';

export const createAssessment = async (body: createAssessmentType): Promise<assessmentType> => {
  return assessmentSchema.parse((await api.post('/marks/assessment', body)).data)
}

export const getAssessments = async (sectionId: string, subjectId?: string): Promise<assessmentType[]> => {
  return z.array(assessmentSchema).parse((await api.get('/marks/assessment', { params: { sectionId, ...(subjectId ? { subjectId } : {}) } })).data)
}

export const enterMarks = async (body: enterMarksType) => {
  return (await api.post('/marks/enter', body)).data
}

export const getMyMarks = async (subjectId?: string): Promise<MarkArray> => {
  return markArraySchema.parse((await api.get('/marks/me', { params: subjectId ? { subjectId } : {} })).data);
};

export const getFinalReport = async (studentId: string, subjectId: string): Promise<SubjectResultType> => {
  return SubjectResultSchema.parse((await api.get(`marks/report/${studentId}/${subjectId}`)).data)
}

export const getMySubjects = async (sectionId: string): Promise<mySubjectsType> => {
  return mySubjectsSchema.parse((await api.get('/marks/my-subjects', { params: { sectionId } })).data)
}

export const getPendingAssessments = async (): Promise<PendingAssessmentArray> => {
  return pendingAssessmentArraySchema.parse((await api.get('/marks/pending')).data);
};