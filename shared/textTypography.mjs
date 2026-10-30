import { BUILTIN_FONTS, normalizeColor } from './brand.mjs';

export const EMPHASIS_FONTS = [...BUILTIN_FONTS, 'heading', 'body'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const exact = (value, fields) => object(value) && Object.keys(value).length === fields.length && fields.every(key => Object.hasOwn(value, key));
const invalid = () => { throw new Error('Stile della parola in evidenza o dello sfondo non valido.'); };
const clean = text => String(text || '').trim().replace(/\s+/g, ' ');

/** I dati salvati descrivono la grafica: non possono introdurre URL, markup o codice. */
export function normalizeEmphasis(value) {
  if (!exact(value, ['text', 'font', 'weight', 'scale', 'color', 'separate_line']) || typeof value.text !== 'string' || value.text.length > 70 || /[\u0000-\u001f]/.test(value.text) || !EMPHASIS_FONTS.includes(value.font) || ![400, 500, 600, 700, 800].includes(value.weight) || !Number.isFinite(value.scale) || value.scale < .5 || value.scale > 3 || typeof value.separate_line !== 'boolean') invalid();
  const color = value.color === 'auto' ? 'auto' : normalizeColor(value.color);
  if (!color) invalid();
  return { text: clean(value.text), font: value.font, weight: value.font === 'Kaushan Script' ? 400 : value.weight, scale: value.scale, color, separate_line: value.separate_line };
}

export function normalizeTextBackdrop(value) {
  if (!exact(value, ['style', 'color', 'opacity']) || !['auto', 'none', 'brush'].includes(value.style) || !Number.isFinite(value.opacity) || value.opacity < 0 || value.opacity > 1) invalid();
  const color = normalizeColor(value.color);
  if (!color) invalid();
  return { style: value.style, color, opacity: value.opacity };
}

/** La prima occorrenza completa viene evidenziata senza modificare né duplicare il titolo. */
export function emphasisParts(text, emphasis) {
  const content = clean(text), phrase = clean(emphasis?.text);
  if (!phrase) return [{ text: content, emphasis: false }];
  const lower = content.toLocaleLowerCase('it'), needle = phrase.toLocaleLowerCase('it');
  let start = lower.indexOf(needle);
  while (start >= 0) {
    let end = start + phrase.length;
    if ((!start || !/[\p{L}\p{N}]/u.test(content[start - 1])) && (end === content.length || !/[\p{L}\p{N}]/u.test(content[end]))) {
      while (/[.,:;!?…]/u.test(content[end] || '')) end++;
      return [{ text: content.slice(0, start), emphasis: false }, { text: content.slice(start, end), emphasis: true }, { text: content.slice(end), emphasis: false }].filter(part => part.text);
    }
    start = lower.indexOf(needle, start + 1);
  }
  return [{ text: content, emphasis: false }];
}

export function emphasisFont(design, emphasis) {
  const source = ['heading', 'body'].includes(emphasis.font) ? design.brand.fonts[emphasis.font] : { family: emphasis.font, url: '' };
  return { ...source, weight: source.family === 'Kaushan Script' ? 400 : emphasis.weight };
}

/** Tutte le righe si riducono insieme; la proporzione tra parola principale e resto del titolo rimane costante. */
export function fitStyledText(text, emphasis, box, measure, { min = 12, max = 100 } = {}) {
  const parts = emphasisParts(text, emphasis);
  function at(size) {
    const lines = []; let runs = [], space = false;
    const metrics = values => {
      const measured = values.map(run => ({ ...run, ...measure(run.text, size * (run.emphasis ? emphasis.scale : 1), run.emphasis) }));
      return { runs: measured, width: measured.reduce((sum, run) => sum + run.width, 0), ascent: Math.max(0, ...measured.map(run => run.ascent)), descent: Math.max(0, ...measured.map(run => run.descent)) };
    };
    const finish = () => { if (runs.length) { lines.push(metrics(runs)); runs = []; } };
    for (const part of parts) {
      if (emphasis.separate_line) { finish(); space = false; }
      for (const value of part.text.match(/\s+|\S+/g) || []) {
        if (/^\s+$/.test(value)) { space = true; continue; }
        const candidate = runs.map(run => ({ ...run }));
        const previous = candidate.at(-1), prefix = previous && space ? ' ' : '';
        if (previous?.emphasis === part.emphasis) previous.text += prefix + value;
        else candidate.push({ text: prefix + value, emphasis: part.emphasis });
        if (metrics(candidate).width > box.width) {
          finish(); runs = [{ text: value, emphasis: part.emphasis }];
          if (metrics(runs).width > box.width) return null;
        } else runs = candidate;
        space = false;
      }
    }
    finish();
    const gap = size * .18, height = lines.reduce((sum, line) => sum + line.ascent + line.descent, 0) + Math.max(0, lines.length - 1) * gap;
    return height <= box.height ? { size, lines, height, gap } : null;
  }
  if (!at(min)) throw new Error('Il titolo è troppo lungo per questo riquadro. Allargalo oppure accorcia la scritta.');
  let low = min, high = max;
  for (let i = 0; i < 12; i++) { const mid = (low + high) / 2; if (at(mid)) low = mid; else high = mid; }
  return at(low);
}
