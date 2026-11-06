export const MEDIA_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
export const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function imageUploadError(file) {
  if (!file || !MEDIA_IMAGE_TYPES.includes(file.type)) return 'Scegli una foto JPEG, PNG, WebP o GIF.';
  return !file.size || file.size > MAX_IMAGE_BYTES ? 'La foto deve essere compresa tra 1 byte e 15 MB.' : '';
}
