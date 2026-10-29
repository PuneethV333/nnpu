import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from './useAuth';
import {
  activateUser,
  deactivateUser,
  getTeachers,
  passOutStudents,
  resetPassword,
  sendCredentials,
  transferStudent,
  updateMyProfilePic,
} from '../api/users';
import { uploadProfileImage } from '../api/cloudinary';
import type { PickedImage } from '../types/cloudinary';
import type { PassOutBody, TeacherOption, TransferStudentBody } from '../types/users';

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

/**
 * The teachers a section can be staffed with.
 *
 * Admin-only, matching `/users/teachers` and the staffing screens. `select`
 * resolves a missing name once, here, so no picker row has to.
 *
 * `useCreateTeacher` invalidates this key, so a teacher created a moment ago is
 * pickable without a reload.
 */
export const useGetTeachers = () => {
  const { isAuthenticated, role } = useAuth();

  return useQuery({
    queryKey: ['teachers'],
    queryFn: getTeachers,
    select: (list): TeacherOption[] =>
      list.map((t) => ({
        id: t.id,
        name: t.name ?? 'Unnamed teacher',
        subjectIds: t.subjectIds,
      })),
    enabled: isAuthenticated && role === 'Admin',
  });
};

/**
 * Changes the signed-in user's own profile picture.
 *
 * Two steps in one mutation, in this order on purpose: the image goes to
 * Cloudinary first, and only a URL that already resolves is written to the
 * profile. The reverse order would leave the record pointing at an image that
 * may never have uploaded.
 *
 * A failed upload therefore costs nothing; a failed PATCH leaves an orphaned
 * image in the Cloudinary folder, which is the cheaper of the two failures and
 * is what the preset's storage cap is for.
 *
 * `refreshUser` rather than a query invalidation: the current user lives in
 * `AuthContext`, not in React Query, and that context is what every header and
 * avatar reads. The roster keys are invalidated too because a student's picture
 * is drawn in the class teacher's attendance list.
 */
export const useUpdateProfilePic = () => {
  const queryClient = useQueryClient();
  const { refreshUser } = useAuth();

  return useMutation({
    mutationKey: ['users', 'profile-pic'],
    mutationFn: async (file: PickedImage) => {
      const url = await uploadProfileImage(file);
      return updateMyProfilePic(url);
    },
    onSuccess: async () => {
      await refreshUser();
      queryClient.invalidateQueries({ queryKey: ['roster'] });
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });
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
 * Emails a student the auth ID they already have. Nothing on the account moves,
 * so there is nothing to invalidate — unlike `useResetPassword`, which changes
 * the password and kills their sessions.
 */
export const useSendCredentials = () => {
  return useMutation({
    mutationKey: ['users', 'send-credentials'],
    mutationFn: (userId: string) => sendCredentials(userId),
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