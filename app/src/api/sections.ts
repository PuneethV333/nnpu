import {
  sectionArraySchema,
  sectionAssignmentsSchema,
  setClassTeacherResponseSchema,
  type AssignSubjectsBody,
  type SectionArray,
  type SectionAssignments,
  type SetClassTeacherBody,
  type SetClassTeacherResponse,
} from '@/src/types/section';
import { api } from './client';

export const getMySections = async (): Promise<SectionArray> => {
  return sectionArraySchema.parse((await api.get('/sections/mine')).data);
};

export const getAllSections = async (): Promise<SectionArray> => {
  return sectionArraySchema.parse((await api.get('/sections')).data);
};

/**
 * The full staffing picture for one section: class teacher plus every subject
 * and its teacher.
 *
 * One request rather than N — the endpoint already returns everything, and
 * fetching subjects and class teacher separately would be two round trips to
 * assemble one screen.
 */
export const getSectionAssignments = async (
  sectionId: string,
): Promise<SectionAssignments> => {
  const res = await api.get(`/sections/${sectionId}/assignments`);
  return sectionAssignmentsSchema.parse(res.data);
};

/**
 * 409 if the teacher is already class teacher elsewhere — `Section.classTeacherId`
 * is `@unique`. `teacherId: null` unstaffs the section.
 */
export const setClassTeacher = async (
  sectionId: string,
  body: SetClassTeacherBody,
): Promise<SetClassTeacherResponse> => {
  const res = await api.patch(`/sections/${sectionId}/class-teacher`, body);
  return setClassTeacherResponseSchema.parse(res.data);
};

/**
 * Upserts the given subject-teacher pairs. Answers with the same payload as
 * `getSectionAssignments`, so the caller can adopt it as fresh cache instead
 * of refetching.
 */
export const assignSubjects = async (
  sectionId: string,
  body: AssignSubjectsBody,
): Promise<SectionAssignments> => {
  const res = await api.post(`/sections/${sectionId}/subjects`, body);
  return sectionAssignmentsSchema.parse(res.data);
};
