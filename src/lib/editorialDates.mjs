const pad = value => String(value).padStart(2, '0');
export function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!Number.isFinite(date.getTime())) return '';
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-');
}
export function localDateTime(value) {
  const date = value instanceof Date ? value : new Date(value);
  return dayKey(date) ? dayKey(date) + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) : '';
}
export function toInstant(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) && localDateTime(date) === value ? date.toISOString() : null;
}
export function monthDays(value) {
  const date = new Date(value.getFullYear(), value.getMonth(), 1, 12);
  date.setDate(date.getDate() - (date.getDay() + 6) % 7);
  return Array.from({ length: 42 }, (_, index) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + index, 12));
}
export function moveMonth(value, delta) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1, 12);
}
export function editorialDate(post) {
  const value = post.editorial_at || post.scheduled_at || post.published_at;
  return value && dayKey(value) ? value : null;
}
export function editorialStage(post) {
  if (post.status === 'da_verificare') return post.status;
  if (post.status === 'in_coda' || post.status === 'in_pubblicazione' || post.status === 'pubblicato' || post.status === 'fallito') return post.status;
  if (post.planning) return post.image_url ? 'post_creato' : post.planning.stage || 'da_preparare';
  return post.editorial_at ? 'pianificato' : post.status || 'bozza';
}
export const STAGES = { da_preparare:'Da preparare', da_fotografare:'Da fotografare', materiale_disponibile:'Materiale disponibile', post_creato:'Post creato', bozza:'Bozza', pronto:'Pronto', pianificato:'Pianificato', in_coda:'Invio automatico in coda', in_pubblicazione:'Invio in corso', pubblicato:'Pubblicato', fallito:'Invio non riuscito', da_verificare:'Esito da verificare sul social' };
export const PLATFORMS = { instagram:'Instagram', facebook:'Facebook', tiktok:'TikTok' };

