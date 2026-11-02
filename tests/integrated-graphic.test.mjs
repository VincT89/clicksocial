import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { saveImage } from '../server/files.mjs';
import { now, uid } from '../server/store.mjs';
import { activeCompositionRoles } from '../server/composition.mjs';
import { integratedGraphicPrompt } from '../server/integratedGraphic.mjs';
import { DEFAULT_MODE } from '../shared/postDefaults.mjs';
import { newPostDesign, normalizeDesign, designLayout } from '../shared/templates.mjs';
import { restoreStudioDraft } from '../src/lib/studioDraft.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');
const full = { x: 0, y: 0, width: 1, height: 1 };
const logoBox = { x: .72, y: .76, width: .2, height: .15 };
const copy = { headline: 'Oggi caffè a 1 €', graphic_subtitle: '', caption: 'La pausa di oggi.', hashtags: '#caffe' };
const scene = { reliable: true, protected_regions: [{ x: .08, y: .08, width: .8, height: .4 }], quiet_regions: [], layout: { heading: null, subtitle: null, logo: logoBox } };

test('grafica integrata: predefiniti, riapertura nativa e compatibilità dei vecchi post', () => {
  assert.equal(DEFAULT_MODE, 'graphic');
  const legacy = newPostDesign();
  assert.equal(normalizeDesign(legacy).text_mode, undefined);
  const design = { ...legacy, text_mode: 'image', graphic_format: '1:1' };
  assert.deepEqual(normalizeDesign(design), design);
  assert.deepEqual(activeCompositionRoles(design, copy), []);
  assert.deepEqual(designLayout(design).photo, full);
  const raw = { version: 1, originalUrl: '/api/files/' + uid(), mode: 'graphic', design, copy: { ...copy, graphic_url: '/api/files/' + uid(), generated_mode: 'graphic' } };
  const restored = restoreStudioDraft(JSON.stringify(raw), {});
  assert.equal(restored.mode, 'graphic'); assert.deepEqual(restored.design, design);
  assert.equal(restored.copy.generated_mode, 'graphic');
  for (const patch of [{ text_mode: 'untrusted' }, { graphic_format: 'unknown' }, { text_mode: 'editable', graphic_format: '1:1' }]) {
    assert.throws(() => normalizeDesign({ ...design, ...patch }));
  }
});

test('grafica integrata: messaggio esatto e logo manuale senza sfondi aggiunti', () => {
  const design = newPostDesign(); design.elements = { logo: { ...logoBox, placement: 'manual' } };
  const prompt = integratedGraphicPrompt(design, copy, 'Oggi offerta caffè a 1 €', {}, true);
  assert.ok(prompt.includes(JSON.stringify({ titolo: copy.headline, sottotitolo: '' })));
  assert.ok(prompt.includes(JSON.stringify(logoBox)));
  assert.match(prompt, /NESSUNO sfondo aggiunto/);
  assert.match(prompt, /NON disegnarlo/);
  assert.doesNotMatch(prompt, /Genera SOLO la parte fotografica|Non aggiungere titoli/);
  const portrait = integratedGraphicPrompt({ ...design, format: '4:5' }, copy, '', {}, false, '1024x1024');
  assert.match(portrait, /porzione visibile/); assert.ok(portrait.includes('"width":0.8'));
});

test('grafica integrata: generazione simulata, logo originale, protezioni e ritorno ai testi modificabili', async t => {
  mkdirSync(resolve('work/tests'), { recursive: true });
  const app = await createApp({ dbDriver: 'sqlite', dataDir: mkdtempSync(resolve('work/tests/integrated-')), port: 0, origin: 'http://127.0.0.1:5180', localMode: true, scheduler: false, smtpHost: '', openaiKey: 'fixture', textModel: 'fixture-text', imageModel: 'gpt-image-2' });
  t.after(() => app.close());
  const user = { id: uid(), role: 'user' };
  await app.db.prepare("INSERT INTO users(id,email,verified,plan,profile,created_at) VALUES(?,?,1,'free','{}',?)").run(user.id, 'integrated@example.test', now());
  const photo = (await saveImage(app.db, app.config, user, png, 'fixture.png')).file_url;
  const logo = (await saveImage(app.db, app.config, user, png, 'logo.png')).file_url;
  let analysis = scene, calls = [];
  const ai = createIntegrations(app.db, app.config, async (url, options) => {
    if (url === 'https://api.openai.com/v1/images/edits') {
      calls.push({ kind: 'image', prompt: options.body.get('prompt') });
      return Response.json({ data: [{ b64_json: png.toString('base64') }] });
    }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body); calls.push({ kind: payload.text.format.name, payload });
    const result = payload.text.format.name === 'photo_composition' ? { composition: analysis } : { ...copy, ...(payload.text.format.schema.properties.composition ? { composition: analysis } : {}) };
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  });
  const design = newPostDesign(); design.brand.logos.color.url = logo;
  const body = { file_url: photo, design, mode: 'graphic', context: 'Oggi offerta caffè a 1 €' };
  const result = await ai.generateCopy(user, body);
  assert.deepEqual(calls.map(call => call.kind), ['social_copy', 'image', 'photo_composition']);
  assert.equal(result.generated_mode, 'graphic'); assert.equal(result.design.text_mode, 'image');
  assert.equal(result.design.graphic_format, '1:1'); assert.ok(result.graphic_url);
  assert.deepEqual(result.design.brand, design.brand); assert.equal(result.logo_url, undefined);
  assert.deepEqual(designLayout(result.design).logo, logoBox);
  assert.deepEqual(activeCompositionRoles(result.design, result), ['logo']);
  for (const key of Object.keys(copy)) assert.equal(result[key], copy[key]);
  assert.equal(calls[0].payload.text.format.schema.properties.text_style, undefined);
  const request = calls[2].payload;
  assert.equal(request.text.format.schema.properties.text_style, undefined);
  assert.equal(request.input[0].content.filter(item => item.type === 'input_image').length, 2);
  assert.match(request.input[0].content[0].text, /scritte/);
  assert.ok(calls[1].prompt.includes(copy.headline));

  const files = readdirSync(join(app.config.dataDir, 'uploads'));
  analysis = { reliable: true, protected_regions: [full], quiet_regions: [], layout: { heading: null, subtitle: null, logo: logoBox } }; calls = [];
  await assert.rejects(() => ai.generateCopy(user, body), error => error.status === 502 && error.code === 'composition_space');
  assert.equal(calls.length, 3, 'Nessun nuovo tentativo a pagamento');
  assert.deepEqual(readdirSync(join(app.config.dataDir, 'uploads')), files);
  assert.equal((await app.db.prepare('SELECT ai_used FROM users WHERE id=?').get(user.id)).ai_used, 1, 'Quota ripristinata dopo il fallimento');
  await app.db.prepare("UPDATE users SET plan='pro' WHERE id=?").run(user.id);

  calls = []; analysis = scene;
  const withoutLogo = await ai.generateCopy(user, { ...body, design: newPostDesign() });
  assert.deepEqual(calls.map(call => call.kind), ['social_copy', 'image']);
  assert.equal(withoutLogo.design.text_mode, 'image');
  assert.deepEqual(activeCompositionRoles(withoutLogo.design, withoutLogo), []);

  const manual = { ...design, elements: { logo: { ...logoBox, placement: 'manual' } } };
  calls = [];
  const fixed = await ai.generateCopy(user, { ...body, design: manual });
  assert.deepEqual(fixed.design.elements.logo, manual.elements.logo);
  assert.ok(calls[1].prompt.includes(JSON.stringify(logoBox)));

  calls = [];
  const invalid = structuredClone(design); invalid.brand.logos.color.url = '/api/files/' + uid();
  await assert.rejects(() => ai.generateCopy(user, { ...body, design: invalid }), error => error.status >= 400 && error.status < 500);
  assert.equal(calls.length, 0, 'La proprietà degli asset è verificata prima delle richieste AI');

  calls = []; analysis = { reliable: true, protected_regions: [], quiet_regions: [full] };
  const editable = await ai.generateCopy(user, { ...body, mode: 'original', design: { ...withoutLogo.design, ai_text_style: false } });
  assert.equal(editable.design.text_mode, undefined); assert.equal(editable.design.graphic_format, undefined);
  assert.equal(editable.generated_mode, 'original'); assert.equal(editable.graphic_url, undefined);
  assert.deepEqual(activeCompositionRoles(editable.design, editable), ['heading']);
  assert.equal(calls.length, 1);
});
