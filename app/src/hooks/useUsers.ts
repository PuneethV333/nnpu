import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  activateUser,
  deactivateUser,
  passOutStudents,
  resetPassword,
  transferStudent,
} from '../api/users';
import type { PassOutBody, TransferStudentBody } from '../types/users';

/**
 * Invalidation shared by every mutation here.
 *
 * Every key below is spelled exactly as the reading hook declares it —
 * `invalidateQueries` prefix-matches, but only from the left, so `['dashboard']`
 * does NOT invalidate a query cached under `['admin-dashboard']`. That is not
 * hypothetical: `['dashboard']` is what this file used to send, so every call
 * here refreshed nothing at all.
 *
 * The set is broad on purpose. These endpoints change whether an account can
 * log in at all, and the rosters, attendance rosters and dashboard totals all
 * read that same field. Getting it wrong leaves a student deactivated in one
 * screen and still listed as active in the next.
 */
const useInvalidateUserState = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    // Prefix keys — these cover ['students', id] and ['roster', id, date].
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['roster'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
    queryClient.invalidateQueries({ queryKey: ['all-sections'] });
    queryClient.invalidateQueries({ queryKey: ['my-sections'] });
  };
};

export const useDeactivateUser = () => {
  const invalidate = useInvalidateUserState();
  return useMutation({
    mutationKey: ['users', 'deactivate'],
    mutationFn: (userId: string) => deactivateUser(userId),
    onSuccess: invalidate,
  });
};

export const useActivateUser = () => {
  const invalidate = useInvalidateUserState();
  return useMutation({
    mutationKey: ['users', 'activate'],
    mutationFn: (userId: string) => activateUser(userId),
    onSuccess: invalidate,
  });
};

export const useTransferStudent = () => {
  const invalidate = useInvalidateUserState();
  return useMutation({
    mutationKey: ['users', 'transfer'],
    mutationFn: ({
      studentId,
      body,
    }: {
      studentId: string;
      body: TransferStudentBody;
    }) => transferStudent(studentId, body),
    onSuccess: invalidate,
  });
};

/**
 * Issues a temp password and emails it.
 *
 * Deliberately no query invalidation: no account field changes. Surface
 * `emailedTo` — it is null when the account has no address, and that is a
 * "copy the password manually" moment, not a success banner.
 */
export const useResetPassword = () => {
  return useMutation({
    mutationKey: ['users', 'reset-password'],
    mutationFn: (userId: string) => resetPassword(userId),
  });
};

/**
 * Deactivates a cohort. Admin-only, and the one irreversible call in this file.
 *
 * Recommended flow is two calls with the same component: `dryRun: true` to
 * preview counts and `classTeachersUntouched`, then the same body without it.
 * A dry run writes nothing, so it does not invalidate.
 */
export const usePassOutStudents = () => {
  const invalidate = useInvalidateUserState();
  return useMutation({
    mutationKey: ['users', 'pass-out'],
    mutationFn: (body: PassOutBody) => passOutStudents(body),
    onSuccess: (result) => {
      if (result.dryRun) return;
      invalidate();
    },
  });
};