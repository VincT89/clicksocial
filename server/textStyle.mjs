import { BUILTIN_FONTS, normalizeColor } from '../shared/brand.mjs';
import { normalizeDesign } from '../shared/templates.mjs';
import { EMPHASIS_FONTS, normalizeEmphasis, normalizeTextBackdrop, emphasisParts } from '../shared/textTypography.mjs';
import { fail } from './store.mjs';

const weights = [400, 500, 600, 700, 800], alignments = ['left', 'center', 'right'];
const fontIds = [...BUILTIN_FONTS, 'brand_heading', 'brand_body'];
const limits = { heading: [40, 144], subtitle: [24, 64] };
const fields = ['font', 'weight', 'font_size', 'color', 'align'];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const hex = { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' };
const backdropSchema = { type: 'object', properties: { style: { type: 'string', enum: ['none'] }, color: hex, opacity: { type: 'number', enum: [0] } }, required: ['style', 'color', 'opacity'], additionalProperties: false };
const emphasisSchema = { anyOf: [{ type: 'null' }, { type: 'object', properties: {
  text: { type: 'string', maxLength: 70 }, font: { type: 'string', enum: EMPHASIS_FONTS }, weight: { type: 'integer', enum: weights },
  scale: { type: 'number', minimum: .5, maximum: 3 }, color: hex, separate_line: { type: 'boolean' },
}, required: ['text', 'font', 'weight', 'scale', 'color', 'separate_line'], additionalProperties: false }] };

export const textStyleSchema = { type: 'object', properties: Object.fromEntries(Object.entries(limits).map(([role, [minimum, maximum]]) => [role, {
  type: 'object', properties: {
    font: { type: 'string', enum: fontIds }, weight: { type: 'integer', enum: weights },
    font_size: { type: 'number', minimum, maximum }, color: { type: 'string', pattern: '^#[0-9A-Fa-f]{6}$' },
    align: { type: 'string', enum: alignments },
    backdrop: backdropSchema, ...(role === 'heading' ? { emphasis: emphasisSchema } : {}),
  }, required: [...fields, 'backdrop', ...(role === 'heading' ? ['emphasis'] : [])], additionalProperties: false,
}])), required: ['heading', 'subtitle'], additionalProperties: false };

export function textStylePrompt(design) {
  return [
    'È attiva l’opzione Stile testo automatico. Progetta una tipografia coerente con questa fotografia, il messaggio e il brand, non una combinazione standard ripetuta su ogni foto.',
    'Restituisci text_style per heading e subtitle: font, weight, font_size in pixel dell’esportazione, color HEX e align. Crea una gerarchia chiara: titolo principale riconoscibile, sottotitolo più discreto. Scegli dimensioni adatte alla lettura su smartphone e ai riquadri che proponi in composition.layout; se la composizione non è richiesta, usa le aree del template. Considera la larghezza reale delle parole, le righe e le dimensioni maggiori dell’eventuale enfasi.',
    'Progetta il titolo anche al suo interno: puoi valorizzare una parola o breve frase con heading.emphasis (text esatto dal titolo, font, weight, scale relativa, color, separate_line). Per un messaggio evocativo puoi abbinare una riga semplice a una parola calligrafica più grande; per altri soggetti scegli una soluzione coerente, senza imporre sempre il corsivo. Usa null se l’enfasi non serve. La punteggiatura immediatamente successiva segue la parola.',
    'Kaushan Script è calligrafico, disponibile al peso 400. Gli identificativi heading e body nell’enfasi indicano i font scelti per le due scritte. Testi e logo devono essere senza sfondo: imposta sempre backdrop.style none e opacity 0. Nessun pannello, fascia, alone, pennellata o sfondo aggiunto. Scegli un colore leggibile direttamente sulla fotografia, nelle aree libere individuate.',
    'Puoi sostituire lo stile precedente, ma non le posizioni manuali. Preferisci un colore del brand oppure un colore coerente con la foto, con contrasto sufficiente. Non aggiungere icone, decorazioni, emoji, testi ornamentali o promesse.',
    'Font disponibili: ' + JSON.stringify([...BUILTIN_FONTS.map(family => ({ id: family, family })), { id: 'brand_heading', family: design.brand.fonts.heading.family }, { id: 'brand_body', family: design.brand.fonts.body.family }]),
    'Usa soltanto questi identificativi: non inventare caratteri e non restituire URL, file, CSS o istruzioni eseguibili. Le scritte e lo stile saranno applicati dall’app e resteranno modificabili.',
  ].join('\n');
}

/** L’AI può scegliere soltanto font già disponibili e stili validati, senza introdurre file o riferimenti esterni. */
export function applyTextStyle(design, value, headline) {
  if (!design.ai_text_style) return design;
  if (!object(value) || Object.keys(value).length !== 2 || !Object.hasOwn(value, 'heading') || !Object.hasOwn(value, 'subtitle')) fail(502, 'L’AI non ha restituito uno stile del testo valido.');
  const fonts = { ...design.brand.fonts }, elements = { ...design.elements };
  for (const [role, [min, max]] of Object.entries(limits)) {
    const style = value[role];
    const expected = [...fields, 'backdrop', ...(role === 'heading' ? ['emphasis'] : [])];
    if (!object(style) || Object.keys(style).length !== expected.length || expected.some(key => !Object.hasOwn(style, key)) || !fontIds.includes(style.font) || !weights.includes(style.weight) || !Number.isFinite(style.font_size) || style.font_size < min || style.font_size > max || typeof style.color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(style.color) || !alignments.includes(style.align)) fail(502, 'Lo stile del testo restituito dall’AI non è utilizzabile.');
    const source = style.font === 'brand_heading' ? design.brand.fonts.heading : style.font === 'brand_body' ? design.brand.fonts.body : { family: style.font, url: '' };
    fonts[role === 'heading' ? 'heading' : 'body'] = { ...source, weight: source.family === 'Kaushan Script' ? 400 : style.weight };
    try {
      elements[role] = { ...elements[role], font_size: style.font_size, color: normalizeColor(style.color), align: style.align, backdrop: normalizeTextBackdrop(style.backdrop) };
      if (style.backdrop.style !== 'none' || style.backdrop.opacity !== 0) throw new Error('Il testo deve essere senza sfondo.');
      if (role === 'heading') {
        delete elements[role].emphasis;
        if (style.emphasis !== null) {
          const emphasis = normalizeEmphasis(style.emphasis);
          if (!emphasis.text || (typeof headline === 'string' && !emphasisParts(headline, emphasis).some(part => part.emphasis))) throw new Error('Parola non presente nel titolo.');
          elements[role].emphasis = emphasis;
        }
      }
    } catch { fail(502, 'Lo stile del testo restituito dall’AI non è utilizzabile.'); }
  }
  return normalizeDesign({ ...design, transparent_overlays: true, brand: { ...design.brand, fonts }, elements });
}
