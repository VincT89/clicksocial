import { Camera, EncodingType, MediaTypeSelection } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const markerKey = 'clicksocial.pending-camera';
let restoredPhoto = null;
export const getRestoredPhoto = () => restoredPhoto;
export const clearRestoredPhoto = () => { restoredPhoto = null; };

export async function mediaPreview(photo) {
  const path = photo.webPath || (photo.uri ? Capacitor.convertFileSrc(photo.uri) : '');
  if (!path) throw new Error('La fotocamera non ha restituito una foto utilizzabile.');
  const response = await fetch(path);
  if (!response.ok) throw new Error('Non riesco a leggere lo scatto.');
  const blob = await response.blob();
  if (!blob.size || blob.size > 15 * 1024 * 1024) throw new Error('Lo scatto supera il limite di 15 MB.');
  return { url: URL.createObjectURL(blob), file: new File([blob], 'scatto-clicksocial.jpg', { type: 'image/jpeg' }) };
}

export async function captureNativePhoto(userId, gallery = false) {
  await Preferences.set({ key: markerKey, value: JSON.stringify({ userId, time: Date.now() }) });
  try {
    const options = { quality: 92, targetWidth: 2048, targetHeight: 2048, correctOrientation: true, editable: /** @type {const} */ ('no') };
    const photo = gallery
      ? (await Camera.chooseFromGallery({ ...options, mediaType: MediaTypeSelection.Photo, allowMultipleSelection: false })).results[0]
      : await Camera.takePhoto({ ...options, encodingType: EncodingType.JPEG, saveToGallery: false });
    if (!photo) return null;
    return await mediaPreview(photo);
  } finally { await Preferences.remove({ key: markerKey }); }
}

export async function restoreNativePhoto(event, userId) {
  if (event.pluginId !== 'Camera' || !['takePhoto', 'chooseFromGallery'].includes(event.methodName)) return false;
  const { value } = await Preferences.get({ key: markerKey });
  await Preferences.remove({ key: markerKey });
  let marker;
  try { marker = JSON.parse(value); } catch { return false; }
  if (marker?.userId !== userId || Date.now() - marker.time > 3600000 || !event.success) return false;
  const photo = event.methodName === 'chooseFromGallery' ? event.data?.results?.[0] : event.data;
  if (!photo) return false;
  restoredPhoto = await mediaPreview(photo);
  window.dispatchEvent(new Event('clicksocial:restored-photo'));
  return true;
}
