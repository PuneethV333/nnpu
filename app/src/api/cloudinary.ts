import axios from 'axios';
import { cloudinaryConfig } from '$/config/env';
import {
  cloudinaryUploadResponseSchema,
  type PickedImage,
} from '@/src/types/cloudinary';
import { IMAGE_UPLOAD_TIMEOUT_MS } from './timeouts';

/** Where avatars land in the media library. The preset may override it. */
const PROFILE_PIC_FOLDER = 'profile-pics';

/**
 * Uploads one image to Cloudinary with the unsigned preset and returns its
 * delivery URL.
 *
 * Deliberately the bare `axios`, NOT the shared `api` client: that one is
 * pinned to our backend's base URL and attaches the user's access token to
 * every request. Sending our bearer token to a third-party host would hand
 * Cloudinary a working credential for this school's API.
 *
 * `Content-Type` is left unset for the same reason as the CSV import — axios
 * and React Native add the multipart boundary themselves, and setting the
 * header without one produces a request the server reads as having no fields.
 */
export const uploadProfileImage = async (
  file: PickedImage,
): Promise<string> => {
  const { cloudName, uploadPreset } = cloudinaryConfig;

  if (!cloudName || !uploadPreset) {
    throw new Error(
      'Image uploads are not configured. Set EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME and EXPO_PUBLIC_CLOUDINARY_UPLOAD_PRESET.',
    );
  }

  const form = new FormData();

  form.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type,
  } as unknown as Blob);
  form.append('upload_preset', uploadPreset);
  form.append('folder', PROFILE_PIC_FOLDER);

  const res = await axios.post(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    form,
    { timeout: IMAGE_UPLOAD_TIMEOUT_MS },
  );

  return cloudinaryUploadResponseSchema.parse(res.data).secure_url;
};
