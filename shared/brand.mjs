export const COLOR_ROLES = ['Primario', 'Secondario', 'Aggiuntivo 1', 'Aggiuntivo 2'];
export const BUILTIN_FONTS = ['Bricolage Grotesque', 'DM Sans', 'Kaushan Script'];
export const LOGO_VARIANTS = { color: 'A colori', light: 'Chiaro', dark: 'Scuro' };
export const DEFAULT_COLORS = ['#202020', '#F4F4F4', '#E5E5E5', '#FFFFFF'];
export const PRIVATE_FILE = /^\/api\/files\/[a-f0-9-]{36}$/;
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const invalid = message => { throw new Error(message); };

// Accetta i codici inseriti dall'utente e conserva un solo formato per palette e prompt.
export function normalizeColor(value) {
  if (typeof value !== 'string') return '';
  const text = value.trim();
  const hex = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(text);
  if (hex) return '#' + (hex[1].length === 3 ? [...hex[1]].map(c => c + c).join('') : hex[1]).toUpperCase();
  const body = /^rgb\(\s*([^()]+)\s*\)$/i.exec(text)?.[1] ?? text;
  const channels = /^\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*$/.exec(body)
    || /^\s*(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})\s*$/.exec(body);
  if (!channels || channels.slice(1).some(c => Number(c) > 255)) return '';
  return '#' + channels.slice(1).map(c => Number(c).toString(16).padStart(2, '0')).join('').toUpperCase();
}

export function normalizeBrand(value) {
  if (!object(value)) invalid('Identità del brand non valida.');
  if (!Array.isArray(value.colors) || value.colors.length !== 4) invalid('Inserisci quattro colori HEX o RGB.');
  const colors = value.colors.map(normalizeColor);
  if (colors.some(c => !c)) invalid('Usa un colore HEX, per esempio #FF8000, oppure RGB con tre numeri da 0 a 255, per esempio rgb(255, 128, 0).');
  const logos = {};
  for (const key of Object.keys(LOGO_VARIANTS)) {
    const logo = value.logos?.[key] || {};
    const url = logo.url || '';
    if (typeof url !== 'string' || (url && !PRIVATE_FILE.test(url))) invalid('Carica il logo in questa installazione.');
    const background = logo.background || 'auto';
    if (!['auto', 'none', 'white', 'black'].includes(background)) invalid('Rimozione dello sfondo non valida.');
    logos[key] = { url, background };
  }
  const fonts = {};
  for (const key of ['heading', 'body']) {
    const font = value.fonts?.[key];
    if (!object(font) || typeof font.family !== 'string' || !font.family.trim() || font.family.length > 80) invalid('Specifica il carattere per titoli e testi.');
    const url = font.url || '';
    if (typeof url !== 'string' || (url && !PRIVATE_FILE.test(url))) invalid('File del carattere non valido.');
    if (!url && !BUILTIN_FONTS.includes(font.family)) invalid('Per un carattere personalizzato carica il file del font.');
    if (![400, 500, 600, 700, 800].includes(font.weight)) invalid('Peso del carattere non valido.');
    fonts[key] = { family: font.family.trim(), url, weight: font.weight };
  }
  return { colors, logos, fonts };
}

export function brandFromProfile(profile = {}) {
  profile ||= {};
  if (profile.brand_settings) return normalizeBrand(profile.brand_settings);
  return normalizeBrand({
    colors: [...DEFAULT_COLORS],
    logos: { color: { url: profile.company_logo_url || '', background: 'auto' } },
    fonts: { heading: { family: BUILTIN_FONTS[0], weight: 700 }, body: { family: BUILTIN_FONTS[1], weight: 400 } },
  });
}

export function luminance(hex) {
  const channels = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
  return channels[0] * .2126 + channels[1] * .7152 + channels[2] * .0722;
}
export function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); }
export function readableColor(preferred, background) {
  return contrast(preferred, background) >= 4.5 ? preferred : contrast('#FFFFFF', background) > contrast('#000000', background) ? '#FFFFFF' : '#000000';
}
