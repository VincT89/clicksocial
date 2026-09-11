const imagePath = value => typeof value === 'string' && /^\/api\/files\/[a-f0-9-]{36}$/.test(value) ? value : null;
const text = (value, max) => typeof value === 'string' ? value.slice(0, max) : '';

export function restoreStudioDraft(raw, defaults) {
  if (!raw || raw.length > 100000) return null;
  let data;
  try { data = JSON.parse(raw); } catch { return null; }
  if (data?.version !== 1 || !imagePath(data.originalUrl)) return null;
  const ranges = { brightness: [50, 150], contrast: [50, 160], saturate: [0, 200], warmth: [-60, 80], blur: [0, 8], vignette: [0, 80] };
  const filters = { ...defaults };
  for (const [key, range] of Object.entries(ranges)) {
    const value = data.filters?.[key];
    if (Number.isFinite(value)) filters[key] = Math.min(range[1], Math.max(range[0], value));
  }
  return {
    originalUrl: data.originalUrl,
    platform: ['instagram', 'facebook', 'tiktok'].includes(String(data.platform).toLowerCase()) ? data.platform : 'Instagram',
    tone: ['amichevole', 'professionale', 'divertente', 'elegante'].includes(data.tone) ? data.tone : 'amichevole',
    mode: ['original', 'enhance', 'creative'].includes(data.mode) ? data.mode : 'original',
    title: text(data.title, 200), context: text(data.context, 5000), filters,
    copy: data.copy ? { headline: text(data.copy.headline, 500), caption: text(data.copy.caption, 20000), hashtags: text(data.copy.hashtags, 5000), graphic_url: imagePath(data.copy.graphic_url) } : null,
    activePreset: text(data.activePreset, 40) || 'Originale',
    editingId: /^[a-f0-9-]{36}$/.test(data.editingId || '') ? data.editingId : null,
    postStatus: ['bozza', 'pronto', 'in_coda', 'in_pubblicazione', 'pubblicato'].includes(data.postStatus) ? data.postStatus : 'bozza',
  };
}

export function draftStorageKey(origin, userId) {
  return 'clicksocial.draft.v1.' + encodeURIComponent(origin) + '.' + userId;
}
