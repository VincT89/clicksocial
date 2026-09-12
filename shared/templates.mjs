import { brandFromProfile, normalizeBrand } from './brand.mjs';

export const FORMATS = {
  '1:1': { label: 'Quadrato', width: 1080, height: 1080 },
  '4:5': { label: 'Verticale feed', width: 1080, height: 1350 },
  '9:16': { label: 'Verticale a schermo intero', width: 1080, height: 1920 },
  '16:9': { label: 'Orizzontale', width: 1920, height: 1080 },
};
const box = (x, y, width, height) => ({ x, y, width, height });
const layout = (photo, heading, subtitle, logo) => ({ photo: box(...photo), heading: box(...heading), subtitle: box(...subtitle), logo: box(...logo) });

// Le versioni pubblicate rimangono immutabili: aggiungere una nuova versione per cambiarle.
const legacyStyle = { overlay: false, textAlign: 'left', logoAlign: 'left', logoVertical: 'center' };
export const LEGACY_TEMPLATES = [
  { ...legacyStyle, id: 'foto', version: 1, name: 'Foto protagonista', description: 'Foto ampia e messaggio in una fascia dedicata.', background: 1, foreground: 0, maxHeadline: 70, maxSubtitle: 100,
    layouts: {
      '1:1': layout([0,0,1,.65], [.065,.695,.87,.145], [.36,.88,.575,.075], [.065,.88,.235,.075]),
      '4:5': layout([0,0,1,.64], [.065,.685,.87,.15], [.36,.875,.575,.075], [.065,.875,.235,.075]),
      '9:16': layout([0,0,1,.59], [.07,.625,.86,.12], [.07,.765,.86,.052], [.07,.845,.25,.045]),
      '16:9': layout([0,0,.57,1], [.62,.12,.32,.37], [.62,.55,.32,.15], [.62,.8,.26,.12]),
    } },
  { ...legacyStyle, id: 'affiancato', version: 1, name: 'Foto e testo', description: 'Due aree distinte, con più spazio per il messaggio.', background: 1, foreground: 0, maxHeadline: 70, maxSubtitle: 140,
    layouts: {
      '1:1': layout([.055,.055,.45,.89], [.56,.09,.385,.35], [.56,.51,.385,.20], [.56,.82,.29,.10]),
      '4:5': layout([.055,.055,.43,.89], [.54,.08,.405,.36], [.54,.5,.405,.21], [.54,.82,.29,.09]),
      '9:16': layout([.07,.09,.86,.36], [.07,.49,.86,.145], [.07,.665,.86,.11], [.07,.83,.28,.055]),
      '16:9': layout([.045,.08,.46,.84], [.56,.11,.385,.36], [.56,.51,.385,.19], [.56,.79,.26,.12]),
    } },
  { ...legacyStyle, id: 'messaggio', version: 1, name: 'Messaggio protagonista', description: 'Titolo in evidenza e fotografia di supporto.', background: 0, foreground: 1, maxHeadline: 70, maxSubtitle: 120,
    layouts: {
      '1:1': layout([.59,.60,.35,.34], [.065,.075,.87,.35], [.065,.47,.87,.09], [.065,.83,.27,.10]),
      '4:5': layout([.52,.59,.42,.35], [.065,.07,.87,.32], [.065,.445,.87,.105], [.065,.83,.28,.085]),
      '9:16': layout([.07,.545,.86,.245], [.07,.10,.86,.24], [.07,.385,.86,.105], [.07,.835,.28,.055]),
      '16:9': layout([.58,.08,.37,.84], [.06,.10,.46,.35], [.06,.50,.46,.18], [.06,.79,.27,.12]),
    } },
];

const overlayLayout = (heading, subtitle, logo, subject) => ({ ...layout([0, 0, 1, 1], heading, subtitle, logo), subject: box(...subject) });
const leftLayouts = {
  '1:1': overlayLayout([.065,.20,.49,.29], [.065,.525,.49,.15], [.71,.835,.225,.10], [.60,.15,.34,.57]),
  '4:5': overlayLayout([.065,.24,.49,.24], [.065,.51,.49,.13], [.71,.86,.225,.075], [.60,.13,.34,.60]),
  '9:16': overlayLayout([.07,.26,.49,.20], [.07,.485,.49,.12], [.68,.805,.25,.055], [.60,.20,.32,.50]),
  '16:9': overlayLayout([.065,.22,.45,.30], [.065,.56,.43,.16], [.77,.81,.165,.12], [.57,.10,.37,.63]),
};
const mirrored = Object.fromEntries(Object.entries(leftLayouts).map(([format, areas]) => [format,
  Object.fromEntries(Object.entries(areas).map(([key, b]) => [key, { ...b, x: +(1 - b.x - b.width).toFixed(6) }]))]));
const overlay = { version: 2, overlay: true, background: 1, foreground: 0, maxHeadline: 70, maxSubtitle: 90, textAlign: 'left', logoAlign: 'right', logoVertical: 'bottom' };

// La scelta mostra soltanto gli schemi attuali; i post salvati continuano a risolvere la propria versione.
export const TEMPLATES = [
  { ...overlay, id: 'foto', name: 'Testi a sinistra', description: 'Testi a sinistra, logo in basso a destra. Soggetto sulla destra.', layouts: leftLayouts },
  { ...overlay, id: 'affiancato', name: 'Testi a destra', description: 'Testi a destra, logo in basso a sinistra. Soggetto sulla sinistra.', textAlign: 'right', logoAlign: 'left', layouts: mirrored },
  { ...overlay, id: 'messaggio', name: 'Testi in alto', description: 'Testi in alto, logo in basso a destra. Soggetto nella parte inferiore.', layouts: {
    '1:1': overlayLayout([.065,.065,.87,.20], [.065,.30,.76,.11], [.71,.835,.225,.10], [.10,.46,.78,.31]),
    '4:5': overlayLayout([.065,.07,.87,.17], [.065,.27,.75,.09], [.71,.86,.225,.075], [.13,.40,.70,.40]),
    '9:16': overlayLayout([.07,.10,.86,.135], [.07,.26,.76,.09], [.68,.805,.25,.055], [.10,.40,.80,.34]),
    '16:9': overlayLayout([.065,.065,.66,.23], [.065,.33,.62,.11], [.77,.81,.165,.12], [.14,.51,.50,.41]),
  } },
  { ...overlay, id: 'basso', name: 'Testi in basso', description: 'Testi in basso, logo in alto a destra. Soggetto nella parte superiore.', logoVertical: 'top', layouts: {
    '1:1': overlayLayout([.065,.62,.87,.19], [.065,.845,.80,.09], [.71,.065,.225,.10], [.10,.22,.80,.34]),
    '4:5': overlayLayout([.065,.66,.87,.16], [.065,.85,.80,.085], [.71,.065,.225,.075], [.10,.19,.80,.41]),
    '9:16': overlayLayout([.07,.625,.86,.13], [.07,.78,.80,.08], [.68,.10,.25,.055], [.10,.22,.80,.34]),
    '16:9': overlayLayout([.065,.59,.72,.19], [.065,.82,.70,.11], [.77,.065,.165,.12], [.10,.10,.60,.41]),
  } },
  { ...overlay, id: 'centrato', name: 'Testi centrati', description: 'Testi al centro, logo in basso al centro. Soggetto sopra il messaggio.', textAlign: 'center', logoAlign: 'center', layouts: {
    '1:1': overlayLayout([.14,.385,.72,.18], [.20,.60,.60,.11], [.37,.84,.26,.095], [.30,.08,.40,.23]),
    '4:5': overlayLayout([.14,.40,.72,.155], [.20,.595,.60,.10], [.37,.85,.26,.075], [.29,.08,.42,.25]),
    '9:16': overlayLayout([.12,.405,.76,.13], [.17,.56,.66,.08], [.37,.805,.26,.055], [.24,.12,.52,.22]),
    '16:9': overlayLayout([.23,.37,.54,.22], [.27,.63,.46,.10], [.43,.82,.14,.11], [.32,.05,.36,.25]),
  } },
];

export function getTemplate(id, version) {
  const template = version === undefined ? TEMPLATES.find(t => t.id === id)
    : [...TEMPLATES, ...LEGACY_TEMPLATES].find(t => t.id === id && t.version === version);
  if (!template) throw new Error('Template o versione non disponibili.');
  return template;
}
export function normalizeDesign(value, profile = {}) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configurazione del template non valida.');
  const template = getTemplate(value.template_id, value.template_version ?? 1);
  if (!Object.hasOwn(FORMATS, value.format)) throw new Error('Formato non disponibile.');
  const crop = value.crop || { x: .5, y: .5 };
  if (!['x', 'y'].every(key => Number.isFinite(crop[key]) && crop[key] >= 0 && crop[key] <= 1)) throw new Error('Ritaglio non valido.');
  const logoVariant = value.logo_variant || 'auto';
  if (!['auto', 'color', 'light', 'dark'].includes(logoVariant)) throw new Error('Variante del logo non valida.');
  return { template_id: template.id, template_version: template.version, format: value.format,
    brand: value.brand ? normalizeBrand(value.brand) : brandFromProfile(profile),
    logo_variant: logoVariant, crop: { x: crop.x, y: crop.y } };
}
export function defaultDesign(profile = {}) {
  profile ||= {};
  const template = getTemplate(profile.preferred_template || 'foto');
  return normalizeDesign({ template_id: template.id, template_version: template.version, format: '1:1' }, profile);
}
export function designBrief(design) {
  const t = getTemplate(design.template_id, design.template_version);
  const f = FORMATS[design.format];
  const areas = t.layouts[design.format], { photo, subtitle } = areas;
  const fontBase = t.overlay ? Math.min(f.width, f.height) : f.width;
  const subtitleBudget = Math.floor(subtitle.width * f.width / (fontBase * .032 * .55)) * Math.floor(subtitle.height * f.height / (fontBase * .032 * 1.2));
  return { template: t.name, version: t.version, format: design.format, export: `${f.width}x${f.height}`,
    photo_area: photo, photo_aspect: +(photo.width * f.width / (photo.height * f.height)).toFixed(3),
    ...(t.overlay ? { composition: 'Foto a tutto sfondo con testi e logo sovrapposti in posizioni fisse', arrangement: t.description,
      coordinate_system: 'Coordinate normalizzate 0–1 dell’intero fotogramma, origine in alto a sinistra; x, y, width, height. Non disegnare i riquadri.',
      reserved_areas: ['heading', 'subtitle', 'logo'].map(role => ({ role, ...expandBox(areas[role], .018, .012) })),
      subject_area: areas.subject, text_alignment: t.textAlign } : {}),
    max_headline: t.maxHeadline, max_subtitle: Math.min(t.maxSubtitle, Math.max(20, subtitleBudget)), colors_hex: design.brand.colors,
    color_roles: ['primario', 'secondario', 'aggiuntivo 1', 'aggiuntivo 2'],
    heading_font: design.brand.fonts.heading.family, body_font: design.brand.fonts.body.family };
}

function expandBox(b, dx, dy) {
  const x = Math.max(0, b.x - dx), y = Math.max(0, b.y - dy);
  return { x: +x.toFixed(6), y: +y.toFixed(6), width: +(Math.min(1, b.x + b.width + dx) - x).toFixed(6), height: +(Math.min(1, b.y + b.height + dy) - y).toFixed(6) };
}

export function fitLogoBox(width, height, area, align = 'left', vertical = 'center') {
  const scale = Math.min(area.width / width, area.height / height);
  const w = width * scale, h = height * scale;
  return { x: area.x + (area.width - w) * (align === 'right' ? 1 : align === 'center' ? .5 : 0),
    y: area.y + (area.height - h) * (vertical === 'bottom' ? 1 : vertical === 'center' ? .5 : 0), width: w, height: h };
}
export function imageRequestSize(design, model) {
  if (!design) return '1024x1024';
  const ratio = Math.min(3, Math.max(1 / 3, designBrief(design).photo_aspect));
  if (!/^gpt-image-2(?:$|-)/.test(model)) return ratio > 1.2 ? '1536x1024' : ratio < .8 ? '1024x1536' : '1024x1024';
  // Circa un megapixel, senza moltiplicare il costo per le dimensioni di esportazione.
  const w = Math.round(Math.sqrt(1048576 * ratio) / 16) * 16;
  const h = Math.round(Math.sqrt(1048576 / ratio) / 16) * 16;
  return `${w}x${h}`;
}

export function fitTextBox(text, rect, measure, { min, max, maxLines = 4, lineHeight = 1.16 }) {
  const content = String(text || '').trim().replace(/\s+/g, ' ');
  if (!content) return { lines: [], size: max, lineHeight: max * lineHeight };
  function at(size) {
    const words = content.split(' '), lines = []; let line = '';
    for (const word of words) {
      if (measure(word, size) > rect.width) return null;
      const next = line ? line + ' ' + word : word;
      if (measure(next, size) <= rect.width) line = next;
      else { lines.push(line); line = word; }
    }
    if (line) lines.push(line);
    return lines.length <= maxLines && lines.length * size * lineHeight <= rect.height ? lines : null;
  }
  if (!at(min)) throw new Error('Il testo è troppo lungo per questo template. Accorcialo oppure scegli un’altra impaginazione.');
  let low = min, high = max;
  for (let i = 0; i < 12; i++) { const mid = (low + high) / 2; if (at(mid)) low = mid; else high = mid; }
  const greedy = at(low), words = content.split(' '), count = greedy.length;
  const target = measure(content, low) / count, dp = Array.from({ length: count + 1 }, () => Array(words.length + 1).fill(null));
  dp[0][0] = { cost: 0, lines: [] };
  for (let row = 1; row <= count; row++) for (let end = row; end <= words.length; end++) {
    for (let start = row - 1; start < end; start++) {
      if (!dp[row - 1][start]) continue;
      const line = words.slice(start, end).join(' '), width = measure(line, low);
      if (width > rect.width) continue;
      const cost = dp[row - 1][start].cost + (width - target) ** 2;
      if (!dp[row][end] || cost < dp[row][end].cost) dp[row][end] = { cost, lines: [...dp[row - 1][start].lines, line] };
    }
  }
  return { lines: dp[count][words.length]?.lines || greedy, size: low, lineHeight: low * lineHeight };
}
export function cropSource(sourceWidth, sourceHeight, targetWidth, targetHeight, crop = { x: .5, y: .5 }) {
  const scale = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const width = targetWidth / scale, height = targetHeight / scale;
  return { x: (sourceWidth - width) * crop.x, y: (sourceHeight - height) * crop.y, width, height };
}
