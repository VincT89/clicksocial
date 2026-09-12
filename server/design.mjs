import { normalizeBrand } from '../shared/brand.mjs';
import { normalizeDesign } from '../shared/templates.mjs';
import { ownedImage, ownedFont } from './files.mjs';
import { fail } from './store.mjs';
import { instant } from './editorial.mjs';

export async function validateBrand(db, config, user, input) {
  let brand;
  try { brand = normalizeBrand(input); } catch (e) { fail(400, e.message); }
  for (const logo of Object.values(brand.logos)) if (logo.url) await ownedImage(db, config, user, logo.url);
  for (const font of Object.values(brand.fonts)) if (font.url) await ownedFont(db, config, user, font.url);
  return brand;
}
export async function validateDesign(db, config, user, input, profile = {}) {
  let design;
  try { design = normalizeDesign(input, profile); } catch (e) { fail(400, e.message); }
  design.brand = await validateBrand(db, config, user, design.brand);
  return design;
}
export function validatePlanning(value) {
  const fields = { topic: 200, objective: 2000, shots: 5000, notes: 5000, provisional_copy: 5000 };
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(k => ![...Object.keys(fields), 'shooting_at', 'stage'].includes(k))) fail(400, 'Dati della bozza non validi.');
  const result = {};
  for (const [key, max] of Object.entries(fields)) {
    const text = value[key] ?? '';
    if (typeof text !== 'string' || text.length > max) fail(400, 'Campo della bozza troppo lungo o non valido: ' + key);
    result[key] = text.trim();
  }
  if (!result.topic) fail(400, 'Scrivi l’argomento della bozza.');
  result.shooting_at = value.shooting_at == null ? null : instant(value.shooting_at);
  result.stage = value.stage || 'da_preparare';
  if (!['da_preparare', 'da_fotografare', 'materiale_disponibile'].includes(result.stage)) fail(400, 'Stato della preparazione non valido.');
  return result;
}
