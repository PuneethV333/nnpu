import { z } from 'zod';

/**
 * What Cloudinary answers an unsigned image upload with.
 *
 * Only the fields we actually use are declared — the real response carries
 * thirty-odd keys (dimensions, bytes, signature, eager transforms) and Zod
 * strips what is not described here.
 *
 * `secure_url` and not `url`: `url` is http, and Android blocks cleartext
 * images in a release build, so the avatar would silently fail to load for
 * every viewer while the record looked fine.
 */
export const cloudinaryUploadResponseSchema = z.object({
  secure_url: z.url(),
  public_id: z.string(),
});

export type CloudinaryUploadResponse = z.infer<
  typeof cloudinaryUploadResponseSchema
>;

/**
 * A picked image, in the shape React Native's `FormData` streams from disk.
 *
 * Mirrors the CSV import's file shape (`src/api/enrollment.ts`) deliberately:
 * RN does NOT accept a Blob or a base64 string here, so reading the photo into
 * memory would be both wasteful and the wrong type.
 */
export interface PickedImage {
  uri: string;
  name: string;
  type: string;
}
