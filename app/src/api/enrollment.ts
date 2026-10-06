import { api } from './client';
import {
  importStudentsResponseSchema,
  type ImportStudentsBody,
  type ImportStudentsResponse,
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