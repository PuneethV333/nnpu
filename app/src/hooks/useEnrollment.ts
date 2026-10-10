import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importStudents, promoteTo2ndPuc } from '../api/enrollment';
import type {
  ImportStudentsBody,
  PromoteTo2ndPucBody,
} from '../types/enrollment';

/**
 * Keys must match the reading hooks exactly. `invalidateQueries`
 * prefix-matches from the left, so `['dashboard']` does nothing — the dashboard
 * is cached under `['admin-dashboard']`. That was a live bug here: CSV import
 * created User rows and refreshed no totals at all.
 *
 * `['students']` and `['roster']` are deliberately prefix-only: they cover the
 * per-section and per-date keys without this file having to know their shape.
 */
const useInvalidateEnrollmentReads = () => {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['students'] });
    queryClient.invalidateQueries({ queryKey: ['roster'] });
    queryClient.invalidateQueries({ queryKey: ['sections'] });
    queryClient.invalidateQueries({ queryKey: ['all-sections'] });
    queryClient.invalidateQueries({ queryKey: ['my-sections'] });
  };
};

/**
 * Uploads a roster CSV into one session.
 *
 * Admin-only on the server (`@Roles('Admin')`), and every `/enrollment/*` route
 * already is, so there is no role gate to add here — unlike the old drive
 * queries, which were gated on `role === 'Admin'` to avoid firing requests
 * that could only ever 403.
 */
export const useImportStudents = () => {
  const invalidate = useInvalidateEnrollmentReads();
  return useMutation({
    mutationKey: ['enrollment', 'import-students'],
    mutationFn: (body: ImportStudentsBody) => importStudents(body),
    onSuccess: invalidate,
  });
};

/**
 * 1st PUC -> 2nd PUC, one cohort at a time.
 *
 * A real run creates the target 2nd-PUC sections in the following year and
 * moves every active student, so rosters and admin totals all change.
 *
 * The result is returned as-is for the caller to render. Because the response
 * shape is identical for a dry run, the recommended flow is one call with
 * `dryRun: true` to confirm the counts and the skipped students, then the same
 * body without it.
 */
export const usePromoteTo2ndPuc = () => {
  const invalidate = useInvalidateEnrollmentReads();
  return useMutation({
    mutationKey: ['enrollment', 'promote-2nd-puc'],
    mutationFn: (body: PromoteTo2ndPucBody) => promoteTo2ndPuc(body),
    onSuccess: (result) => {
      // A dry run wrote nothing, so invalidating would re-fetch identical data
      // and flash the list for no reason.
      if (result.dryRun) return;
      invalidate();
    },
  });
};