import { normalizeColor } from './brand.mjs';

export const ELEMENT_LABELS = { heading: 'Titolo', subtitle: 'Testo di supporto', logo: 'Logo' };
const coordinates = ['x', 'y', 'width', 'height'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const round = value => Math.round(value * 1000000) / 1000000;
export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const isManualElement = element => Number.isFinite(element?.x) && element.placement !== 'auto';

/** Le stesse regole proteggono salvataggi, anteprima e ripristino della bozza mobile. */
export function normalizeElements(value) {
  if (!object(value) || Object.keys(value).some(key => !Object.hasOwn(ELEMENT_LABELS, key))) throw new Error('Elementi della grafica non validi.');
  const result = {};
  for (const role of Object.keys(ELEMENT_LABELS)) {
    if (!Object.hasOwn(value, role)) continue;
    const input = value[role], allowed = role === 'logo' ? [...coordinates, 'placement'] : [...coordinates, 'placement', 'font_size', 'color', 'align'];
    if (!object(input) || Object.keys(input).some(key => !allowed.includes(key))) throw new Error('Impostazioni dell’elemento non valide.');
    const item = {};
    if (coordinates.some(key => Object.hasOwn(input, key))) {
      if (!coordinates.every(key => Number.isFinite(input[key])) || input.x < 0 || input.y < 0 || input.width < .001 || input.height < .001 || input.x + input.width > 1.000001 || input.y + input.height > 1.000001) throw new Error('Mantieni gli elementi dentro la grafica.');
      for (const key of coordinates) item[key] = round(input[key]);
    }
    if (Object.hasOwn(input, 'placement')) {
      if (!['auto', 'manual'].includes(input.placement) || !Number.isFinite(item.x)) throw new Error('Origine della posizione non valida.');
      item.placement = input.placement;
    }
    if (Object.hasOwn(input, 'font_size')) {
      if (!Number.isFinite(input.font_size) || input.font_size < 12 || input.font_size > 600) throw new Error('La dimensione del testo deve essere tra 12 e 600 pixel.');
      item.font_size = round(input.font_size);
    }
    if (Object.hasOwn(input, 'color')) {
      const color = input.color === 'auto' ? 'auto' : normalizeColor(input.color);
      if (!color) throw new Error('Colore del testo non valido.');
      item.color = color;
    }
    if (Object.hasOwn(input, 'align')) {
      if (!['left', 'center', 'right'].includes(input.align)) throw new Error('Allineamento del testo non valido.');
      item.align = input.align;
    }
    result[role] = item;
  }
  return result;
}

export function moveBox(box, x, y) {
  return { x: round(clamp(x, 0, 1 - box.width)), y: round(clamp(y, 0, 1 - box.height)), width: box.width, height: box.height };
}

/** Un solo fattore conserva le proporzioni del marchio e della selezione durante il ridimensionamento. */
export function resizeBox(box, requestedScale) {
  const scale = clamp(requestedScale, Math.max(.001 / box.width, .001 / box.height), Math.min(1 / box.width, 1 / box.height));
  const width = round(box.width * scale), height = round(box.height * scale);
  return { x: round(Math.min(box.x, 1 - width)), y: round(Math.min(box.y, 1 - height)), width, height };
}

export function changeElement(design, role, patch) {
  return { ...design, elements: { ...design.elements, [role]: { ...design.elements?.[role], ...patch, ...(coordinates.some(key => Object.hasOwn(patch, key)) ? { placement: 'manual' } : {}) } } };
}

export function scaleElement(design, role, box, factor, fontSize) {
  if (role !== 'logo') factor = clamp(factor, 12 / fontSize, 600 / fontSize);
  const resized = resizeBox(box, factor);
  const applied = resized.width / box.width;
  return changeElement(design, role, { ...resized, ...(role === 'logo' ? {} : { font_size: round(clamp(fontSize * applied, 12, 600)) }) });
}
