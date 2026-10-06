import { useMutation, useQueryClient } from '@tanstack/react-query';
import { importStudents } from '../api/enrollment';
import type { ImportStudentsBody } from '../types/enrollment';

export interface ImportStudentsResult {
  created: { name: string; email: string; authId: string }[];
  skipped: { line: number; name: string; reason: string }[];
  emailed: number;
  emailFailed: number;
}

/**
 * Uploads a roster CSV into one session.
 *
 * Admin-only on the server (`@Roles('Admin')`), and every `/enrollment/*` route
 * already is, so there is no role gate to add here — unlike the old drive
 * queries, which were gated on `role === 'Admin'` to avoid firing requests
 * that could only ever 403.
 */
export const useImportStudents = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ['enrollment', 'import-students'],
    mutationFn: (body: ImportStudentsBody) => importStudents(body),
    onSuccess: () => {
      // The import creates User rows, so both of these change.
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sections'] });
      queryClient.invalidateQueries({ queryKey: ['enrollment'] });
    },
  });
};