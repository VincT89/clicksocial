import { acquireImage, acquireFont } from './mobile';
import { removeLogoBackground } from './logoBackground';
import { drawFilteredImage } from './photoFilters';
import { contrast, readableColor } from '../../shared/brand.mjs';
import { getTemplate, FORMATS, fitTextBox, cropSource, normalizeDesign, fitLogoBox } from '../../shared/templates.mjs';
import { logoTreatment, textTreatment } from '../../shared/overlayContrast.mjs';

const fonts = new Map(), logos = new Map();
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

function photoSamples(ctx, area, mask) {
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
    else if (mask[m + 3] >= coreAlpha) samples.push({ paper, ink: [...mask.slice(m, m + 3)], alpha: mask[m + 3] / 255 });
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
    const treatment = logoTreatment(photoSamples(ctx, position, sampleCtx.getImageData(0, 0, 64, 64).data));
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

/** @param {{ onWarning?: (message: string) => void }} [options] */
export async function renderTemplate(canvas, source, input, filters, headline = '', subtitle = '', options = {}) {
  headline = String(headline || ''); subtitle = String(subtitle || '');
  const design = normalizeDesign(input), template = getTemplate(design.template_id, design.template_version);
  const { width: w, height: h } = FORMATS[design.format], layout = template.layouts[design.format];
  const background = design.brand.colors[template.background];
  const [headingFamily, bodyFamily, legacyLogo] = await Promise.all([ensureFont(design.brand.fonts.heading), ensureFont(design.brand.fonts.body), template.overlay ? null : selectLogo(design, background)]);
  canvas.width = w; canvas.height = h; const ctx = canvas.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, w, h);
  const rect = value => ({ x: value.x * w, y: value.y * h, width: value.width * w, height: value.height * h });
  const photo = rect(layout.photo), crop = cropSource(source.naturalWidth, source.naturalHeight, photo.width, photo.height, design.crop);
  const cropped = document.createElement('canvas'); cropped.width = Math.round(photo.width); cropped.height = Math.round(photo.height);
  const inputCtx = cropped.getContext('2d'); inputCtx.fillStyle = '#FFFFFF'; inputCtx.fillRect(0, 0, cropped.width, cropped.height);
  inputCtx.drawImage(source, crop.x, crop.y, crop.width, crop.height, 0, 0, cropped.width, cropped.height);
  const filtered = document.createElement('canvas'); filtered.width = cropped.width; filtered.height = cropped.height;
  const photoCtx = filtered.getContext('2d');
  await drawFilteredImage(photoCtx, cropped, cropped.width, cropped.height, filters);
  if (filters.vignette > 0) {
    const pw = filtered.width, ph = filtered.height, gradient = photoCtx.createRadialGradient(pw / 2, ph / 2, Math.min(pw, ph) * .35, pw / 2, ph / 2, Math.max(pw, ph) * .72);
    gradient.addColorStop(0, 'rgba(0,0,0,0)'); gradient.addColorStop(1, `rgba(0,0,0,${filters.vignette / 100 * .75})`);
    photoCtx.fillStyle = gradient; photoCtx.fillRect(0, 0, pw, ph);
  }
  ctx.drawImage(filtered, photo.x, photo.y, photo.width, photo.height);
  ctx.fillStyle = readableColor(design.brand.colors[template.foreground], background);
  if (template.overlay && (headline.trim() || subtitle.trim())) {
    const areas = [headline.trim() && rect(layout.heading), subtitle.trim() && rect(layout.subtitle)].filter(Boolean);
    const treatment = textTreatment(areas.flatMap(area => photoSamples(ctx, area)), design.brand.colors);
    const x = Math.min(...areas.map(b => b.x)), y = Math.min(...areas.map(b => b.y));
    const right = Math.max(...areas.map(b => b.x + b.width)), bottom = Math.max(...areas.map(b => b.y + b.height));
    const pad = Math.min(w, h) * .012;
    shadeRegion(ctx, { x: x - pad, y: y - pad, width: right - x + pad * 2, height: bottom - y + pad * 2 }, treatment, Math.min(w, h) * .14);
    ctx.fillStyle = treatment.color;
  }
  const drawText = (text, area, font, family, heading) => {
    const box = rect(area), measure = (line, size) => {
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
    const fitted = fitTextBox(text, box, measure, { min: base * (heading ? .042 : .028), max: base * (heading ? .085 : .035), maxLines: heading ? 5 : 4, lineHeight });
    ctx.font = `${font.weight} ${fitted.size}px "${family}"`; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
    const top = box.y + (template.overlay && heading ? box.height - fitted.lines.length * fitted.lineHeight : 0);
    fitted.lines.forEach((line, i) => {
      const metrics = ctx.measureText(line), left = Math.max(0, metrics.actualBoundingBoxLeft);
      const lineWidth = left + Math.max(metrics.width, metrics.actualBoundingBoxRight);
      const offset = template.textAlign === 'right' ? box.width - lineWidth : template.textAlign === 'center' ? (box.width - lineWidth) / 2 : 0;
      ctx.fillText(line, box.x + offset + left, top + fitted.size * ascent + i * fitted.lineHeight);
    });
  };
  drawText(headline, layout.heading, design.brand.fonts.heading, headingFamily, true);
  drawText(subtitle, layout.subtitle, design.brand.fonts.body, bodyFamily, false);
  const selected = template.overlay ? await selectOverlayLogo(design, template, ctx, rect(layout.logo)) : null;
  const logo = selected?.canvas || legacyLogo?.canvas;
  if (logo) {
    const area = selected?.position || fitLogoBox(logo.width, logo.height, rect(layout.logo));
    if (selected) shadeRegion(ctx, area, selected.treatment, Math.min(w, h) * .06);
    ctx.drawImage(logo, area.x, area.y, area.width, area.height);
  }
  const warning = selected?.warning || legacyLogo?.warning;
  if (warning) options.onWarning?.(warning);
  return canvas;
}
