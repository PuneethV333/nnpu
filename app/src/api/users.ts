import {
  passOutResponseSchema,
  resetPasswordResponseSchema,
  setActiveResponseSchema,
  transferStudentResponseSchema,
  type PassOutBody,
  type PassOutResponse,
  type ResetPasswordResponse,
  type SetActiveResponse,
  type TransferStudentBody,
  type TransferStudentResponse,
} from '@/src/types/users';
import { api } from './client';

/**
 * Lifecycle writes. All five are admin-only on the server.
 *
 * Throttles are not uniform and reflect blast radius: pass-out is 10/min and
 * reset-password is 10/min because either one mints credentials or kills a
 * whole cohort's sessions; activate/deactivate/transfer are 30/min because
 * they are per-user and reversible.
 *
 * Deactivate and pass-out revoke the target's live sessions server-side, so a
 * "deactivated" user is logged out immediately rather than at token expiry.
 */
export const deactivateUser = async (
  userId: string,
): Promise<SetActiveResponse> => {
  const res = await api.post(`/users/${userId}/deactivate`);
  return setActiveResponseSchema.parse(res.data);
};

export const activateUser = async (
  userId: string,
): Promise<SetActiveResponse> => {
  const res = await api.post(`/users/${userId}/activate`);
  return setActiveResponseSchema.parse(res.data);
};

/** Body is just the destination section. */
export const transferStudent = async (
  studentId: string,
  body: TransferStudentBody,
): Promise<TransferStudentResponse> => {
  const res = await api.post(`/users/${studentId}/transfer`, body);
  return transferStudentResponseSchema.parse(res.data);
};

/** Issues a temp password and emails it. No response if mail fails. */
export const resetPassword = async (
  userId: string,
): Promise<ResetPasswordResponse> => {
  const res = await api.post(`/users/${userId}/reset-password`);
  return resetPasswordResponseSchema.parse(res.data);
};

/**
 * Deactivates every active student in the given sections and revokes sessions.
 *
 * Students only — a teacher attached to a passing-out cohort is reported under
 * `classTeachersUntouched` and left alone. Pass `dryRun: true` first: the
 * response shape is identical, so the same component can render the preview
 * and the result.
 */
export const passOutStudents = async (
  body: PassOutBody,
): Promise<PassOutResponse> => {
  const res = await api.post('/users/pass-out', body);
  return passOutResponseSchema.parse(res.data);
};