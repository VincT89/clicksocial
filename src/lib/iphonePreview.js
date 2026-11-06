export const PREVIEW_CHANNEL = 'clicksocial-iphone-preview-v1';
export function isIPhonePreview() {
  try { return window.parent !== window && window.frameElement?.getAttribute('data-clicksocial-preview') === 'iphone'; } catch { return false; }
}
export function previewMessage(event, source) {
  return event.origin === window.location.origin && event.source === source && event.data?.channel === PREVIEW_CHANNEL;
}
export function sendPreviewMessage(target, type, data = {}) {
  target?.postMessage({ ...data, channel: PREVIEW_CHANNEL, type }, window.location.origin);
}
