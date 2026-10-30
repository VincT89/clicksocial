import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyTextStyle, textStyleSchema } from '../server/textStyle.mjs';
import { defaultDesign, normalizeDesign, designLayout } from '../shared/templates.mjs';
import { restoreStudioDraft } from '../src/lib/studioDraft.mjs';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { now, uid } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { emphasisParts, fitStyledText, normalizeEmphasis } from '../shared/textTypography.mjs';

const style = {
  heading: { font: 'DM Sans', weight: 800, font_size: 88, color: '#263b30', align: 'left', emphasis: { text: 'passo', font: 'Kaushan Script', weight: 400, scale: 1.6, color: '#26462F', separate_line: true }, backdrop: { style: 'brush', color: '#FFF2DC', opacity: .9 } },
  subtitle: { font: 'Bricolage Grotesque', weight: 500, font_size: 32, color: '#334433', align: 'left', backdrop: { style: 'none', color: '#FFFFFF', opacity: 0 } },
};

test('stile AI: opzione esplicita, posizioni e logo conservati, bozza ripristinabile', () => {
  const design = defaultDesign();
  design.elements = { heading: { x: .1, y: .1, width: .6, height: .25, placement: 'manual', color: '#AA2211' }, logo: { backdrop_opacity: .4, backdrop_size: 1.6 } };
  const before = structuredClone(design);
  assert.equal(applyTextStyle(design, style), design);
  const changed = applyTextStyle({ ...design, ai_text_style: true }, style);
  assert.deepEqual(design, before);
  assert.deepEqual(designLayout(changed), designLayout(design));
  assert.deepEqual(changed.elements.logo, design.elements.logo);
  assert.equal(changed.elements.heading.placement, 'manual');
  assert.equal(changed.elements.heading.color, '#263B30');
  assert.equal(changed.elements.heading.font_size, 88);
  assert.deepEqual(changed.brand.fonts.heading, { family: 'DM Sans', weight: 800, url: '' });
  assert.deepEqual(changed.brand.colors, design.brand.colors);
  assert.equal(changed.elements.heading.emphasis.font, 'Kaushan Script');
  assert.equal(changed.elements.heading.backdrop.style, 'brush');
  assert.deepEqual(restoreStudioDraft(JSON.stringify({ version: 1, originalUrl: '/api/files/' + uid(), design: changed }), {}).design, changed);
  assert.equal(applyTextStyle({ ...changed, ai_text_style: false }, { ...style, heading: { ...style.heading, color: '#FFFFFF' } }).elements.heading.color, '#263B30');
  for (const value of ['true', 1, null, {}]) assert.throws(() => normalizeDesign({ ...design, ai_text_style: value }));
});

test('stile AI: nessun font o URL esterno e rifiuto dei valori non validi', () => {
  const design = { ...defaultDesign(), ai_text_style: true };
  design.brand.fonts.heading = { family: 'Carattere del brand', weight: 400, url: '/api/files/' + uid() };
  const branded = applyTextStyle(design, { ...style, subtitle: { ...style.subtitle, font: 'brand_heading' } });
  assert.equal(branded.brand.fonts.body.url, design.brand.fonts.heading.url);
  assert.equal(branded.brand.fonts.body.family, design.brand.fonts.heading.family);
  for (const invalid of [null, [], {}, { ...style, url: 'https://example.test' }, { ...style, subtitle: undefined }]) assert.throws(() => applyTextStyle(design, invalid), error => error.status === 502);
  for (const patch of [{ font: 'Carattere inventato' }, { font: 'https://example.test/font.ttf' }, { weight: 900 }, { font_size: 1 }, { font_size: 600 }, { font_size: '80' }, { font_size: NaN }, { color: 'url(https://example.test)' }, { color: '#FFF' }, { align: 'justify' }, { url: '/api/files/' + uid() }]) assert.throws(() => applyTextStyle(design, { ...style, heading: { ...style.heading, ...patch } }), error => error.status === 502);
  assert.equal(textStyleSchema.additionalProperties, false);
  for (const patch of [{ font: 'https://example.test/font.ttf' }, { url: '/api/files/' + uid() }, { scale: 10 }, { text: 'x'.repeat(71) }, { separate_line: 'true' }]) assert.throws(() => applyTextStyle(design, { ...style, heading: { ...style.heading, emphasis: { ...style.heading.emphasis, ...patch } } }), error => error.status === 502);
  assert.throws(() => applyTextStyle(design, style, 'Una frase differente'), error => error.status === 502);
  assert.throws(() => normalizeDesign({ ...design, elements: { subtitle: { emphasis: style.heading.emphasis } } }));
  assert.throws(() => normalizeDesign({ ...design, elements: { heading: { backdrop: { ...style.heading.backdrop, opacity: 2 } } } }));
  const reset = applyTextStyle({ ...design, elements: { heading: { emphasis: style.heading.emphasis } } }, { ...style, heading: { ...style.heading, emphasis: null } });
  assert.equal(reset.elements.heading.emphasis, undefined);
});

test('titolo misto: testo e punteggiatura integri, dimensioni contenute e proporzione costante', () => {
  const emphasis = normalizeEmphasis({ ...style.heading.emphasis, text: 'camminare', scale: 1.7 });
  const title = 'Il piacere di camminare.';
  assert.equal(emphasisParts(title, emphasis).map(part => part.text).join(''), title);
  assert.equal(emphasisParts(title, emphasis).find(part => part.emphasis).text, 'camminare.');
  assert.ok(!emphasisParts('Il piacere di ricamminare', emphasis).some(part => part.emphasis));
  const measure = (text, size) => ({ width: text.length * size * .5, left: 0, ascent: size * .8, descent: size * .2 });
  for (const separate_line of [true, false]) for (const box of [{ width: 650, height: 260 }, { width: 240, height: 150 }]) {
    const fitted = fitStyledText(title, { ...emphasis, separate_line }, box, measure, { max: 90 });
    assert.ok(fitted.height <= box.height && fitted.lines.every(line => line.width <= box.width));
    assert.equal(fitted.lines.map(line => line.runs.map(run => run.text).join('')).join(' '), title);
    const accented = fitted.lines.flatMap(line => line.runs).find(run => run.emphasis);
    assert.ok(Math.abs(accented.ascent / (fitted.size * .8) - emphasis.scale) < .001);
  }
  const fallback = fitStyledText('Un altro messaggio', emphasis, { width: 400, height: 200 }, measure);
  assert.ok(fallback.lines.flatMap(line => line.runs).every(run => !run.emphasis));
  assert.throws(() => fitStyledText(title, emphasis, { width: 1, height: 1 }, measure), /riquadro/);
});

test('generazione simulata: stile nella richiesta esistente, sulla foto finale per Enhance e Creative', async t => {
  mkdirSync(resolve('work/tests'), { recursive: true });
  const app = await createApp({ dbDriver: 'sqlite', dataDir: mkdtempSync(resolve('work/tests/text-style-')), port: 0, origin: 'http://127.0.0.1:5180', localMode: true, scheduler: false, smtpHost: '', openaiKey: 'fixture-only', textModel: 'gpt-5.6-luna', imageModel: 'gpt-image-2' });
  t.after(() => app.close());
  const user = { id: uid() };
  await app.db.prepare("INSERT INTO users(id,email,verified,plan,profile,created_at) VALUES(?,?,1,'pro','{}',?)").run(user.id, 'style@example.test', now());
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');
  const image = await saveImage(app.db, app.config, user, png, 'fixture.png');
  const calls = [], composition = { reliable: true, protected_regions: [], quiet_regions: [{ x: 0, y: 0, width: 1, height: 1 }] };
  let returnedStyle = style;
  const ai = createIntegrations(app.db, app.config, async (url, options) => {
    if (url.endsWith('/images/edits')) { calls.push({ kind: 'image' }); return Response.json({ data: [{ b64_json: png.toString('base64') }] }); }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body), schema = payload.text.format.schema;
    calls.push({ kind: payload.text.format.name, schema, prompt: payload.input[0].content[0].text });
    const result = { ...(schema.properties.headline ? { headline: 'Il passo successivo', graphic_subtitle: 'Una prospettiva alla volta', caption: 'Una scena di montagna.', hashtags: '#Paesaggio' } : {}), ...(schema.properties.composition ? { composition } : {}), text_style: returnedStyle };
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  });
  const design = { ...defaultDesign(), ai_text_style: true };
  for (const mode of ['original', 'enhance', 'creative']) {
    calls.length = 0;
    const generated = await ai.generateCopy(user, { file_url: image.file_url, design, mode });
    assert.equal(calls.length, mode === 'original' ? 1 : 3);
    const styleCall = calls.find(call => call.schema?.properties.text_style);
    assert.equal(styleCall.kind, mode === 'original' ? 'social_copy' : 'photo_composition');
    assert.match(styleCall.prompt, /Stile testo automatico/);
    assert.equal(generated.design.brand.fonts.heading.family, 'DM Sans');
    assert.equal(generated.design.elements.subtitle.font_size, 32);
    assert.equal(generated.design.ai_text_style, true);
    assert.equal(generated.text_style, undefined);
  }
  calls.length = 0;
  const off = { ...design, ai_text_style: false, elements: { heading: { color: '#C02030' } } };
  const unchanged = await ai.generateCopy(user, { file_url: image.file_url, design: off, mode: 'original' });
  assert.deepEqual(unchanged.design, off);
  assert.ok(calls.every(call => !call.schema?.properties.text_style));
  returnedStyle = { ...style, heading: { ...style.heading, font: 'https://example.test/unsafe-font' } };
  await assert.rejects(() => ai.generateCopy(user, { file_url: image.file_url, design, mode: 'original' }), /stile del testo/);
});
