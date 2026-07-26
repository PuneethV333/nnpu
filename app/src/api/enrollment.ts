import {
  createDriveResponseSchema,
  enrollmentDriveArraySchema,
  getDriveResponseSchema,
  enrollmentSubmissionArraySchema,
  promoteAllResponseSchema,
  type CreateDrive,
  type CreateDriveResponse,
  type EnrollmentDrive,
  type GetDriveResponse,
  type EnrollmentSubmission,
  type PromoteAllResponse,
} from '@/src/types/enrollment';
import { api } from './client';

export const createDrive = async (
  body: CreateDrive,
): Promise<CreateDriveResponse> => {
  const res = await api.post('/enrollment/drive', body);
  return createDriveResponseSchema.parse(res.data);
};

export const listDrives = async (): Promise<EnrollmentDrive[]> => {
  const res = await api.get('/enrollment/drive');
  return enrollmentDriveArraySchema.parse(res.data);
};

export const getDrive = async (id: string): Promise<GetDriveResponse> => {
  const res = await api.get(`/enrollment/drive/${id}`);
  return getDriveResponseSchema.parse(res.data);
};

export const listSubmissions = async (
  driveId: string,
  status?: string,
): Promise<EnrollmentSubmission[]> => {
  const res = await api.get(`/enrollment/drive/${driveId}/submissions`, {
    params: status ? { status } : {},
  });
  return enrollmentSubmissionArraySchema.parse(res.data);
};

export const promoteSubmission = async (id: string) => {
  const res = await api.post(`/enrollment/submission/${id}/promote`);
  return res.data;
};

export const promoteAll = async (
  driveId: string,
): Promise<PromoteAllResponse> => {
  const res = await api.post(`/enrollment/drive/${driveId}/promote-all`);
  return promoteAllResponseSchema.parse(res.data);
};
