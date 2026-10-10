import { api } from './client';
import {
  importStudentsResponseSchema,
  promoteTo2ndPucResponseSchema,
  type ImportStudentsBody,
  type ImportStudentsResponse,
  type PromoteTo2ndPucBody,
  type PromoteTo2ndPucResponse,
} from '@/src/types/enrollment';

/**
 * Uploads a roster CSV as multipart/form-data.
 *
 * React Native's `FormData` accepts this `{ uri, name, type }` shape for a file
 * and streams it from disk — it does NOT accept a Blob or a base64 string, so
 * reading the file into memory here would be the wrong shape anyway.
 *
 * `Content-Type` is deliberately left unset. Setting it to
 * `multipart/form-data` without the boundary is a classic way to get a server
 * that silently sees zero fields; axios/React Native add the boundary when the
 * header is absent.
 */
export const importStudents = async (
  body: ImportStudentsBody,
): Promise<ImportStudentsResponse> => {
  const form = new FormData();

  form.append('sectionId', body.sectionId);
  form.append('year', String(body.year));
  form.append('file', {
    uri: body.file.uri,
    name: body.file.name,
    type: body.file.type || 'text/csv',
  } as unknown as Blob);

  const res = await api.post('/enrollment/students/import', form);

  return importStudentsResponseSchema.parse(res.data);
};
/**
 * Moves every active student in the named 1st-PUC sections into the matching
 * 2nd-PUC section of the next academic year.
 *
 * `dryRun` is worth wiring up rather than treating as optional: the server
 * creates the target sections as a side effect of a real run, so an admin
 * should see the counts and the created-section list first. The response shape
 * is identical either way — only `dryRun` flips.
 */
export const promoteTo2ndPuc = async (
  body: PromoteTo2ndPucBody,
): Promise<PromoteTo2ndPucResponse> => {
  const res = await api.post('/enrollment/promote-2nd-puc', body);
  return promoteTo2ndPucResponseSchema.parse(res.data);
};
