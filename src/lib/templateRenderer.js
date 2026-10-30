import { acquireImage, acquireFont } from './mobile';
import { removeLogoBackground } from './logoBackground';
import { drawFilteredImage } from './photoFilters';
import { contrast, readableColor } from '../../shared/brand.mjs';
import { getTemplate, FORMATS, fitTextBox, cropSource, normalizeDesign, fitLogoBox, designLayout } from '../../shared/templates.mjs';
import { logoTreatment, textTreatment, backdropFor, overlayScore, rgb } from '../../shared/overlayContrast.mjs';
import { logoBackdropBox } from '../../shared/designElements.mjs';
import { emphasisFont, emphasisParts, fitStyledText } from '../../shared/textTypography.mjs';
import { brushTextBox, drawTextBrush } from './textBackdrop';

const fonts = new Map(), logos = new Map();
const photoCache = new WeakMap();

/** Il trascinamento ridisegna gli elementi senza ricalcolare i filtri su milioni di pixel. */
function preparedPhoto(source, width, height, crop, filters) {
  const key = JSON.stringify({ width, height, crop, filters });
  if (photoCache.get(source)?.key === key) return photoCache.get(source).promise;
  const promise = (async () => {
    const cropped = document.createElement('canvas'); cropped.width = Math.round(width); cropped.height = Math.round(height);
    const input = cropped.getContext('2d'); input.fillStyle = '#FFFFFF'; input.fillRect(0, 0, cropped.width, cropped.height);
    input.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, cropped.width, cropped.height);
    const canvas = document.createElement('canvas'); canvas.width = cropped.width; canvas.height = cropped.height;
    const ctx = canvas.getContext('2d');
    await drawFilteredImage(ctx, cropped, canvas.width, canvas.height, filters);
    if (filters.vignette > 0) {
      const w = canvas.width, h = canvas.height;
      const gradient = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * .35, w / 2, h / 2, Math.max(w, h) * .72);
      gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100 * .75})`);
      ctx.fillStyle = gradient; ctx.fillRect(0, 0, w, h);
    }
    return canvas;
  })();
  photoCache.set(source, { key, promise });
  promise.catch(() => { if (photoCache.get(source)?.promise === promise) photoCache.delete(source); });
  return promise;
}
function memo(map, key, create) {
  if (!map.has(key)) {
    if (map.size >= 24) map.delete(map.keys().next().value);
    map.set(key, create().catch(error => { map.delete(key); throw error; }));
  }
  return map.get(key);
}
export async function ensureFont(font) {
  const family = font.url ? 'ClickSocial-' + font.url.split('/').pop() : font.family;
  return memo(fonts, family + ':' + font.weight, async () => {
    if (font.url) {
      const resource = await acquireFont(font.url);
      try { const face = new FontFace(family, `url("${resource.url}")`, { weight: String(font.weight) }); await face.load(); document.fonts.add(face); }
      finally { resource.release(); }
    } else {
      const loaded = await document.fonts.load(`${font.weight} 32px "${family}"`);
      if (!loaded.length) throw new Error('Il carattere non è disponibile. Aggiorna la pagina prima di esportare.');
    }
    return family;
  });
}
export async function prepareLogo(logo) {
  return memo(logos, logo.url + ':' + logo.background, async () => {
    const resource = await acquireImage(logo.url);
    try {
      const image = new Image();
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(new Error('Non riesco a leggere il logo aziendale.')); image.src = resource.url; });
      const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
      removeLogoBackground(pixels.data, canvas.width, canvas.height, logo.background);
      ctx.putImageData(pixels, 0, 0);
      let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
      for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) if (pixels.data[(y * canvas.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      if (right < left) throw new Error('Il logo risulta vuoto dopo la pulizia. Controlla la rimozione dello sfondo nel Profilo.');
      const cropped = document.createElement('canvas'); cropped.width = right - left + 1; cropped.height = bottom - top + 1;
      cropped.getContext('2d').drawImage(canvas, left, top, cropped.width, cropped.height, 0, 0, cropped.width, cropped.height);
      return cropped;
    } finally { resource.release(); }
  });
}
function logoContrast(canvas, background) {
  const sample = document.createElement('canvas'); sample.width = sample.height = 32;
  const ctx = sample.getContext('2d'); ctx.drawImage(canvas, 0, 0, 32, 32);
  const data = ctx.getImageData(0, 0, 32, 32).data; let sum = 0, weight = 0;
  for (let i = 0; i < data.length; i += 4) if (data[i + 3] > 128) {
    const hex = '#' + [...data.slice(i, i + 3)].map(v => v.toString(16).padStart(2, '0')).join('');
    sum += contrast(hex, background); weight++;
  }
  return weight ? sum / weight : 0;
}
async function selectLogo(design, background) {
  const candidates = Object.entries(design.brand.logos).filter(([variant, logo]) => logo.url && (design.logo_variant === 'auto' || variant === design.logo_variant));
  if (!candidates.length) {
    if (design.logo_variant !== 'auto') throw new Error('Questa variante del logo non è caricata. Scegli Automatico oppure aggiungila nel Profilo.');
    return null;
  }
  const loaded = await Promise.all(candidates.map(async ([variant, logo]) => { const canvas = await prepareLogo(logo); return { variant, canvas, score: logoContrast(canvas, background) }; }));
  // Mantiene il marchio a colori quando è già leggibile sullo sfondo del template.
  const best = loaded.find(item => item.variant === 'color' && item.score >= 4.5) || loaded.sort((a, b) => b.score - a.score)[0];
  return { canvas: best.canvas, warning: best.score < 2 ? 'Il logo ha poco contrasto con questo sfondo. Puoi continuare a modificare e salvare il post; prova un’altra variante del logo o un altro template per migliorarne la leggibilità.' : '' };
}

function photoSamples(ctx, area, mask, backdrop) {
  const x = Math.floor(area.x), y = Math.floor(area.y), w = Math.max(1, Math.floor(area.width)), h = Math.max(1, Math.floor(area.height));
  const data = ctx.getImageData(x, y, w, h).data, samples = [];
  const size = mask ? 64 : 32;
  // Valuta il corpo del marchio, evitando che i bordi antialias risultino falsamente illeggibili.
  // La soglia è relativa: un logo interamente traslucido conserva la propria opacità nel calcolo.
  let coreAlpha = 0;
  if (mask) for (let i = 3; i < mask.length; i += 4) coreAlpha = Math.max(coreAlpha, mask[i]);
  coreAlpha = Math.max(8, coreAlpha * .9);
  for (let row = 0; row < size; row++) for (let col = 0; col < size; col++) {
    const pixel = (Math.min(h - 1, Math.floor((row + .5) * h / size)) * w + Math.min(w - 1, Math.floor((col + .5) * w / size))) * 4;
    const paper = [...data.slice(pixel, pixel + 3)], m = (row * size + col) * 4;
    if (!mask) samples.push(paper);
    else if (mask[m + 3] >= coreAlpha) {
      let coverage = 1;
      if (backdrop) {
        const px = x + (col + .5) * w / size, py = y + (row + .5) * h / size, b = backdrop.box;
        const dx = Math.max(b.x - px, px - b.x - b.width, 0), dy = Math.max(b.y - py, py - b.y - b.height, 0);
        coverage = Math.max(0, 1 - Math.hypot(dx, dy) / backdrop.feather);
      }
      samples.push({ paper, ink: [...mask.slice(m, m + 3)], alpha: mask[m + 3] / 255, coverage });
    }
  }
  return samples;
}

// Correzione locale della leggibilità, con bordi sfumati: la foto resta a pieno formato.
function shadeRegion(ctx, area, treatment, feather) {
  if (!treatment?.opacity) return;
  const { x, y, width: w, height: h } = area;
  const paint = (fill, a, b, c, d) => { ctx.fillStyle = fill; ctx.fillRect(a, b, c, d); };
  ctx.save(); ctx.globalAlpha = treatment.opacity;
  paint(treatment.tint, x, y, w, h);
  const edge = (x0, y0, x1, y1, a, b, c, d) => {
    const g = ctx.createLinearGradient(x0, y0, x1, y1); g.addColorStop(0, treatment.tint); g.addColorStop(1, treatment.tint + '00'); paint(g, a, b, c, d);
  };
  edge(x, y, x - feather, y, x - feather, y, feather, h);
  edge(x + w, y, x + w + feather, y, x + w, y, feather, h);
  edge(x, y, x, y - feather, x, y - feather, w, feather);
  edge(x, y + h, x, y + h + feather, x, y + h, w, feather);
  for (const [cx, cy, a, b] of [[x,y,x-feather,y-feather], [x+w,y,x+w,y-feather], [x,y+h,x-feather,y+h], [x+w,y+h,x+w,y+h]]) {
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, feather); g.addColorStop(0, treatment.tint); g.addColorStop(1, treatment.tint + '00'); paint(g, a, b, feather, feather);
  }
  ctx.restore();
}

async function selectOverlayLogo(design, template, ctx, area) {
  const candidates = Object.entries(design.brand.logos).filter(([variant, logo]) => logo.url && (design.logo_variant === 'auto' || variant === design.logo_variant));
  if (!candidates.length) {
    if (design.logo_variant !== 'auto') throw new Error('Questa variante del logo non è caricata. Scegli Automatico oppure aggiungila nel Profilo.');
    return null;
  }
  const loaded = await Promise.all(candidates.map(async ([variant, logo]) => {
    const canvas = await prepareLogo(logo), position = fitLogoBox(canvas.width, canvas.height, area, template.logoAlign, template.logoVertical);
    const sample = document.createElement('canvas'); sample.width = sample.height = 64;
    const sampleCtx = sample.getContext('2d'); sampleCtx.drawImage(canvas, 0, 0, 64, 64);
    const size = design.elements?.logo?.backdrop_size || 1;
    const backdrop = { box: logoBackdropBox(position, size), feather: Math.min(ctx.canvas.width, ctx.canvas.height) * .01 * size };
    const treatment = logoTreatment(photoSamples(ctx, position, sampleCtx.getImageData(0, 0, 64, 64).data, backdrop), design.elements?.logo?.backdrop_opacity);
    return { variant, canvas, position, treatment };
  }));
  const usable = loaded.filter(item => item.treatment.sufficient);
  const best = usable.find(item => item.variant === 'color' && item.treatment.opacity === 0)
    || usable.sort((a, b) => (a.treatment.opacity + (a.variant === 'color' ? 0 : .025)) - (b.treatment.opacity + (b.variant === 'color' ? 0 : .025)))[0]
    || loaded.sort((a, b) => b.treatment.score - a.treatment.score)[0];
  return { ...best, warning: best.treatment.sufficient ? '' : 'Il logo ha ancora poco contrasto in questa zona della foto. Puoi continuare a modificare e salvare il post; prova un’altra variante, un altro template o regola il ritaglio per migliorarne la leggibilità.' };
}

// Verifica l'impaginazione anche quando l'utente cambia sezione durante la generazione.
export async function checkGeneratedTemplate(url, design, filters, headline, subtitle) {
  const resource = await acquireImage(url);
  try {
    const image = new Image(); image.crossOrigin = 'anonymous';
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error('Non riesco a caricare la foto generata. Riapri lo Studio.'));
      image.src = resource.url;
    });
    await renderTemplate(document.createElement('canvas'), image, design, filters, headline, subtitle);
  } finally { resource.release(); }
}

/** @param {{ onWarning?: (message: string) => void, onLayout?: (layout: any) => void }} [options] */
export async function renderTemplate(canvas, source, input, filters, headline = '', subtitle = '', options = {}) {
  headline = String(headline || ''); subtitle = String(subtitle || '');
  const design = normalizeDesign(input), template = getTemplate(design.template_id, design.template_version);
  const { width: w, height: h } = FORMATS[design.format], layout = designLayout(design);
  const elementLayout = {};
  const logoBackdrop = design.elements?.logo || {};
  const useOverlayLogo = template.overlay || logoBackdrop.backdrop_opacity !== undefined || logoBackdrop.backdrop_size !== undefined;
  const background = design.brand.colors[template.background];
  const emphasis = design.elements?.heading?.emphasis;
  const accentFont = emphasis ? emphasisFont(design, emphasis) : null;
  const [headingFamily, bodyFamily, legacyLogo, accentFamily] = await Promise.all([ensureFont(design.brand.fonts.heading), ensureFont(design.brand.fonts.body), useOverlayLogo ? null : selectLogo(design, background), accentFont ? ensureFont(accentFont) : null]);
  canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
  const rect = value => ({ x: value.x * w, y: value.y * h, width: value.width * w, height: value.height * h });
  const photo = rect(layout.photo), crop = cropSource(source.naturalWidth, source.naturalHeight, photo.width, photo.height, design.crop);
  const filtered = await preparedPhoto(source, photo.width, photo.height, crop, filters);
  ctx.drawImage(filtered, photo.x, photo.y, photo.width, photo.height);
  let autoColor = readableColor(design.brand.colors[template.foreground], background);
  if (template.overlay && (headline.trim() || subtitle.trim())) {
    const areas = [['heading', headline], ['subtitle', subtitle]].filter(([role, text]) => {
      const item = design.elements?.[role];
      return text.trim() && !item?.emphasis && (!item?.backdrop || item.backdrop.style === 'auto') && (!item?.color || item.color === 'auto');
    }).map(([role]) => rect(layout[role]));
    if (areas.length) {
      const treatment = textTreatment(areas.flatMap(area => photoSamples(ctx, area)), design.brand.colors), pad = Math.min(w, h) * .005;
      /** La leggibilità viene corretta solo vicino alle scritte, senza oscurare il soggetto fra due riquadri distanti. */
      for (const area of areas) shadeRegion(ctx, { x: area.x - pad, y: area.y - pad, width: area.width + pad * 2, height: area.height + pad * 2 }, treatment, Math.min(w, h) * .01);
      autoColor = treatment.color;
    }
  }
  const drawText = (text, role, font, family, heading) => {
    const area = layout[role], custom = design.elements?.[role] || {};
    const outer = rect(area), backdropMode = custom.backdrop?.style || 'auto';
    const box = backdropMode === 'brush' ? brushTextBox(outer) : outer;
    if (text.trim() && backdropMode === 'brush') drawTextBrush(ctx, outer, custom.backdrop);
    const rich = heading && emphasis && emphasisParts(text, emphasis).some(part => part.emphasis);
    const explicitColor = custom.color && custom.color !== 'auto';
    const color = explicitColor ? custom.color : (rich || backdropMode !== 'auto') ? textTreatment(photoSamples(ctx, box), design.brand.colors).color : autoColor;
    const accentColor = emphasis?.color && emphasis.color !== 'auto' ? emphasis.color : color;
    const measure = (line, size) => {
      ctx.font = `${font.weight} ${size}px "${family}"`;
      const metrics = ctx.measureText(line);
      return Math.max(0, metrics.actualBoundingBoxLeft) + Math.max(metrics.width, metrics.actualBoundingBoxRight);
    };
    ctx.font = `${font.weight} 100px "${family}"`;
    const metrics = ctx.measureText(String(text || ''));
    const ascent = Math.max(0, metrics.actualBoundingBoxAscent) / 100;
    const descent = Math.max(0, metrics.actualBoundingBoxDescent) / 100;
    const lineHeight = Math.max(heading ? 1.12 : 1.2, ascent + descent + .06);
    const base = template.overlay ? Math.min(w, h) : w;
    const maximum = custom.font_size || base * (heading ? .085 : .035);
    const fitted = rich ? fitStyledText(text, emphasis, box, (line, size, accented) => {
      ctx.font = `${accented ? accentFont.weight : font.weight} ${size}px "${accented ? accentFamily : family}"`;
      const m = ctx.measureText(line), left = Math.max(0, m.actualBoundingBoxLeft);
      return { width: left + Math.max(m.width, m.actualBoundingBoxRight), left, ascent: Math.max(0, m.actualBoundingBoxAscent), descent: Math.max(0, m.actualBoundingBoxDescent) };
    }, { min: 12, max: maximum }) : fitTextBox(text, box, measure, { min: custom.font_size ? 12 : base * (heading ? .042 : .028), max: maximum, maxLines: custom.font_size ? 30 : heading ? 5 : 4, lineHeight });
    if (custom.font_size && fitted.size < custom.font_size - 1) options.onWarning?.('Il testo è stato adattato allo spazio disponibile. Ingrandisci il riquadro o accorcia la scritta per usare tutta la dimensione scelta.');
    if (text.trim() && (explicitColor || rich || backdropMode !== 'auto')) {
      const colors = rich ? [color, accentColor] : [color];
      const pairs = photoSamples(ctx, box).flatMap(paper => colors.map(ink => ({ paper, ink: rgb(ink) })));
      const treatment = backdropMode === 'auto' ? backdropFor(pairs) : null;
      if (treatment) shadeRegion(ctx, box, treatment, Math.min(w, h) * .01);
      else if (overlayScore(pairs) < 4.5) options.onWarning?.('Il colore scelto per ' + (heading ? 'il titolo' : 'il testo di supporto') + ' ha poco contrasto. Prova un altro colore, aumenta lo sfondo o sposta la scritta.');
    }
    if (heading && emphasis?.text && !rich) options.onWarning?.('La parola da evidenziare non è più nel titolo. Aggiornala in Grafica oppure disattiva l’enfasi.');
    if (rich) {
      let y = box.y + (backdropMode === 'brush' ? (box.height - fitted.height) / 2 : template.overlay ? box.height - fitted.height : 0);
      ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
      for (const line of fitted.lines) {
        const align = custom.align || template.textAlign;
        let x = box.x + (align === 'right' ? box.width - line.width : align === 'center' ? (box.width - line.width) / 2 : 0);
        for (const run of line.runs) {
          ctx.font = `${run.emphasis ? accentFont.weight : font.weight} ${fitted.size * (run.emphasis ? emphasis.scale : 1)}px "${run.emphasis ? accentFamily : family}"`;
          ctx.fillStyle = run.emphasis ? accentColor : color;
          ctx.fillText(run.text, x + run.left, y + line.ascent); x += run.width;
        }
        y += line.ascent + line.descent + fitted.gap;
      }
      elementLayout[role] = { box: area, fontSize: fitted.size, color, align: custom.align || template.textAlign, visible: !!text.trim() };
      return;
    }
    ctx.fillStyle = color;
    ctx.font = `${font.weight} ${fitted.size}px "${family}"`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const top = box.y + (backdropMode === 'brush' ? (box.height - fitted.lines.length * fitted.lineHeight) / 2 : template.overlay && heading ? box.height - fitted.lines.length * fitted.lineHeight : 0);
    fitted.lines.forEach((line, i) => {
      const metrics = ctx.measureText(line), left = Math.max(0, metrics.actualBoundingBoxLeft);
      const lineWidth = left + Math.max(metrics.width, metrics.actualBoundingBoxRight);
      const align = custom.align || template.textAlign;
      const offset = align === 'right' ? box.width - lineWidth : align === 'center' ? (box.width - lineWidth) / 2 : 0;
      ctx.fillText(line, box.x + offset + left, top + fitted.size * ascent + i * fitted.lineHeight);
    });
    elementLayout[role] = { box: area, fontSize: fitted.size, color, align: custom.align || template.textAlign, visible: !!text.trim() };
  };
  drawText(headline, 'heading', design.brand.fonts.heading, headingFamily, true);
  drawText(subtitle, 'subtitle', design.brand.fonts.body, bodyFamily, false);
  const logoStyle = Number.isFinite(design.elements?.logo?.x) ? { ...template, logoAlign: 'left', logoVertical: 'top' } : template;
  const selected = useOverlayLogo ? await selectOverlayLogo(design, logoStyle, ctx, rect(layout.logo)) : null;
  const logo = selected?.canvas || legacyLogo?.canvas;
  if (logo) {
    const area = selected?.position || fitLogoBox(logo.width, logo.height, rect(layout.logo));
    if (selected) {
      const size = logoBackdrop.backdrop_size || 1;
      shadeRegion(ctx, logoBackdropBox(area, size), selected.treatment, Math.min(w, h) * .01 * size);
    }
    ctx.drawImage(logo, area.x, area.y, area.width, area.height);
    elementLayout.logo = { box: { x: area.x / w, y: area.y / h, width: area.width / w, height: area.height / h }, visible: true, backdropOpacity: selected?.treatment.opacity || 0 };
  }
  const warning = selected?.warning || legacyLogo?.warning;
  if (warning) options.onWarning?.(warning);
  options.onLayout?.(elementLayout);
  return canvas;
}
