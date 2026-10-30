import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { activeCompositionRoles, fitComposition, frameComposition } from '../server/composition.mjs';
import { imageGeometry } from '../server/imageGeometry.mjs';
import { contains, overlaps } from '../shared/compositionGeometry.mjs';
import { FORMATS, defaultDesign, designBrief, designLayout, normalizeDesign } from '../shared/templates.mjs';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { now, uid } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { changeElement } from '../shared/designElements.mjs';

const full = { x: 0, y: 0, width: 1, height: 1 };
const emptyScene = { reliable: true, protected_regions: [], quiet_regions: [full] };
const copy = { headline: 'Il nostro prodotto', graphic_subtitle: 'Dettagli reali', caption: 'Descrizione di prova', hashtags: '#test' };
const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');

test('composizione: il titolo lascia il soggetto sulla sinistra e mantiene gli stili scelti', () => {
  const design = defaultDesign();
  design.elements = { heading: { color: '#C02030', font_size: 62 }, subtitle: { color: '#153030' } };
  const before = structuredClone(design), protectedArea = { x: .03, y: .07, width: .33, height: .87 };
  const analysis = { reliable: true, protected_regions: [protectedArea], quiet_regions: [{ x: .39, y: 0, width: .61, height: 1 }] };
  const result = fitComposition(design, copy, analysis), layout = designLayout(result.design);
  assert.equal(result.adjusted, true);
  for (const role of activeCompositionRoles(design, copy)) {
    assert.equal(overlaps(layout[role], protectedArea, .018), false);
    assert.ok(contains(analysis.quiet_regions[0], layout[role]));
  }
  assert.ok(layout.subtitle.y > layout.heading.y + layout.heading.height);
  assert.deepEqual(result.design.brand, before.brand);
  assert.equal(result.design.elements.heading.color, '#C02030');
  assert.equal(result.design.elements.heading.font_size, 62);
  assert.deepEqual(design, before);
  assert.deepEqual(normalizeDesign(result.design), result.design);
});

test('composizione: verifica tutte le proporzioni, logo e separazione tra elementi', () => {
  for (const format of Object.keys(FORMATS)) {
    const design = { ...defaultDesign(), format };
    design.brand.logos.color.url = '/api/files/' + uid();
    const regions = { reliable: true, protected_regions: [{ x: .015, y: .01, width: .28, height: .98 }], quiet_regions: [{ x: .32, y: 0, width: .68, height: 1 }] };
    const { design: adapted } = fitComposition(design, copy, regions), layout = designLayout(adapted);
    const boxes = activeCompositionRoles(adapted, copy).map(role => layout[role]);
    for (const box of boxes) assert.equal(overlaps(box, regions.protected_regions[0], .018), false, format);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) assert.equal(overlaps(boxes[i], boxes[j], .012), false, format);
    assert.ok(layout.logo.width >= .14, 'Il logo non viene rimpicciolito per forzare la composizione');
  }
});

test('composizione: una nuova foto può adattare di nuovo le posizioni automatiche, ma non quelle spostate a mano', () => {
  const leftSubject = { protected_regions: [{ x: 0, y: .02, width: .34, height: .96 }], quiet_regions: [{ x: .38, y: 0, width: .62, height: 1 }] };
  const rightSubject = { protected_regions: [{ x: .65, y: .02, width: .35, height: .96 }], quiet_regions: [{ x: 0, y: 0, width: .61, height: 1 }] };
  const first = fitComposition(defaultDesign(), copy, leftSubject).design;
  assert.equal(first.elements.heading.placement, 'auto');
  const second = fitComposition(first, copy, rightSubject);
  assert.equal(second.adjusted, true); assert.ok(designLayout(second.design).heading.x < .15);
  const styled = changeElement(first, 'heading', { color: '#123456' });
  assert.equal(styled.elements.heading.placement, 'auto');
  const moved = changeElement(first, 'heading', { x: .45 });
  assert.equal(moved.elements.heading.placement, 'manual');
  assert.throws(() => fitComposition(moved, copy, rightSubject), /posizione personalizzata/);
});

test('composizione: posizioni manuali conservate e conflitti segnalati senza spostamenti silenziosi', () => {
  const design = defaultDesign();
  design.elements = { heading: { x: .1, y: .1, width: .6, height: .2, color: '#AA2233' }, subtitle: { x: .1, y: .35, width: .6, height: .12 } };
  assert.deepEqual(fitComposition(design, copy, emptyScene), { design, adjusted: false });
  const before = structuredClone(design);
  assert.throws(() => fitComposition(design, copy, { ...emptyScene, protected_regions: [{ x: .2, y: .15, width: .2, height: .2 }] }), /posizione personalizzata di titolo/);
  assert.deepEqual(design, before);
  assert.throws(() => fitComposition(defaultDesign(), copy, { protected_regions: [full], quiet_regions: [full] }), /spazio libero sufficiente/);
  assert.throws(() => fitComposition(defaultDesign(), copy, { protected_regions: [], quiet_regions: [] }), /spazio libero sufficiente/);
});

test('composizione: ritaglio e spostamento della foto proiettano le aree nel fotogramma finale', () => {
  const design = defaultDesign(), regions = { reliable: true, protected_regions: [{ x: .5, y: .25, width: .1, height: .5 }], quiet_regions: [full] };
  assert.deepEqual(frameComposition(regions, design, { width: 2000, height: 1000 }).protected_regions[0], { x: .5, y: .25, width: .2, height: .5 });
  design.crop.x = 1;
  assert.deepEqual(frameComposition(regions, design, { width: 2000, height: 1000 }).protected_regions[0], { x: 0, y: .25, width: .2, height: .5 });
  const offscreen = { ...regions, protected_regions: [{ x: .05, y: .2, width: .1, height: .2 }] };
  assert.deepEqual(frameComposition(offscreen, design, { width: 2000, height: 1000 }).protected_regions, []);
  for (const format of Object.keys(FORMATS)) assert.deepEqual(frameComposition(emptyScene, { ...design, format }, { width: 2000, height: 1000 }).quiet_regions, [full]);
});

test('composizione: analisi assenti, incerte o malformate non passano il controllo', () => {
  for (const analysis of [null, {}, { ...emptyScene, reliable: false }, { ...emptyScene, quiet_regions: null }, { ...emptyScene, quiet_regions: Array(17).fill(full) }, { ...emptyScene, protected_regions: [{ ...full, x: NaN }] }, { ...emptyScene, quiet_regions: [{ ...full, x: .5 }] }, { ...emptyScene, quiet_regions: [{ ...full, url: 'https://example.test' }] }]) {
    assert.throws(() => frameComposition(analysis, defaultDesign(), { width: 1000, height: 1000 }), error => error.status === 502);
  }
  for (const element of [{ x: .1, y: .1, width: .3, height: .2, placement: 'unknown' }, { placement: 'auto' }]) assert.throws(() => normalizeDesign({ ...defaultDesign(), elements: { heading: element } }));
});

test('brief: le posizioni personalizzate non riservano al soggetto una zona occupata', () => {
  const design = defaultDesign();
  design.elements = { heading: { x: .6, y: .18, width: .35, height: .3 }, subtitle: { x: .6, y: .52, width: .35, height: .13 } };
  const brief = designBrief(design);
  assert.ok(brief.subject_area);
  assert.ok(brief.reserved_areas.every(area => !overlaps(area, brief.subject_area)));
  assert.match(brief.arrangement, /personalizzata/);
  assert.doesNotMatch(designBrief({ ...defaultDesign(), elements: {} }).arrangement, /personalizzata/);
  assert.equal(designBrief({ ...design, elements: { heading: full } }).subject_area, null);
});

test('foto: dimensioni PNG, GIF, JPEG orientato e WebP, con rifiuto dei dati incompleti', () => {
  assert.deepEqual(imageGeometry(png), { width: 1, height: 1 });
  const gif = Buffer.from('47494638396120031002', 'hex');
  assert.deepEqual(imageGeometry(gif), { width: 800, height: 528 });
  const jpeg = Buffer.from('ffd8ffe1002245786966000049492a0008000000010012010300010000000600000000000000ffc00011080320064003011100021100031100ffd9', 'hex');
  assert.deepEqual(imageGeometry(jpeg), { width: 800, height: 1600 });
  const webp = Buffer.alloc(30); webp.write('RIFF'); webp.writeUInt32LE(22, 4); webp.write('WEBPVP8X', 8); webp.writeUInt32LE(10, 16); webp.writeUIntLE(799, 24, 3); webp.writeUIntLE(599, 27, 3);
  assert.deepEqual(imageGeometry(webp), { width: 800, height: 600 });
  for (const invalid of [Buffer.alloc(0), png.subarray(0, 20), jpeg.subarray(0, 12), webp.subarray(0, 25), Buffer.from('ffd8ffe1ffff')]) assert.throws(() => imageGeometry(invalid));
});

test('generazione: analisi finale, costi, quota e file privati restano coerenti anche in caso di errore', async t => {
  mkdirSync(resolve('work/tests'), { recursive: true });
  const app = await createApp({ dbDriver: 'sqlite', dataDir: mkdtempSync(resolve('work/tests/composition-')), port: 0, origin: 'http://127.0.0.1:5180', localMode: true, scheduler: false, smtpHost: '', openaiKey: 'fixture', textModel: 'gpt-5.6-luna', imageModel: 'gpt-image-2' });
  t.after(() => app.close());
  const user = { id: uid(), email: 'composition@example.test', role: 'user' };
  await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'user','free','{}',?)").run(user.id, user.email, now());
  const photo = (await saveImage(app.db, app.config, user, png, 'fixture.png')).file_url;
  let scene = emptyScene, calls = [];
  const ai = createIntegrations(app.db, app.config, async (url, options) => {
    if (url.endsWith('/images/edits')) { calls.push({ kind: 'image', prompt: options.body.get('prompt') }); return Response.json({ data: [{ b64_json: png.toString('base64') }], usage: { input_tokens: 50, output_tokens: 60 } }); }
    assert.equal(url, 'https://api.openai.com/v1/responses');
    const payload = JSON.parse(options.body); calls.push({ kind: payload.text.format.name, payload });
    return Response.json({ status: 'completed', usage: { input_tokens: 100, output_tokens: 200 }, output: [{ content: [{ type: 'output_text', text: JSON.stringify(payload.text.format.name === 'photo_composition' ? { composition: scene } : { ...copy, ...(payload.text.format.schema.properties.composition ? { composition: scene } : {}) }) }] }] });
  });
  const body = { file_url: photo, design: defaultDesign() };
  const creative = await ai.generateCopy(user, { ...body, mode: 'creative' });
  assert.deepEqual(calls.map(item => item.kind), ['social_copy', 'image', 'photo_composition']);
  assert.ok(creative.graphic_url); assert.equal(creative.composition_adjusted, false); assert.equal(creative.composition, undefined);
  assert.match(calls[1].prompt, /una sola composizione editoriale/); assert.match(calls[1].prompt, /Non aggiungere titoli/);
  let logs = await app.db.prepare('SELECT data FROM ai_logs WHERE user_id=?').all(user.id);
  assert.deepEqual(JSON.parse(logs[0].data).ai_calls.map(call => call.phase), ['copy', 'image', 'composition']);
  assert.equal(JSON.parse(logs[0].data).text_requests, 2);
  const files = readdirSync(join(app.config.dataDir, 'uploads'));
  scene = { ...emptyScene, protected_regions: [full] }; calls = [];
  await assert.rejects(() => ai.generateCopy(user, { ...body, mode: 'enhance' }), /spazio libero sufficiente/);
  assert.equal(calls.length, 3, 'Nessun tentativo automatico aggiuntivo');
  assert.deepEqual(readdirSync(join(app.config.dataDir, 'uploads')), files, 'Nessun file generato non utilizzabile conservato');
  assert.equal((await app.db.prepare('SELECT ai_used FROM users WHERE id=?').get(user.id)).ai_used, 1, 'Quota gratuita rimborsata in caso di errore');
  logs = await app.db.prepare('SELECT data FROM ai_logs WHERE user_id=?').all(user.id);
  const failed = logs.map(row => JSON.parse(row.data)).find(log => log.status === 'error');
  assert.equal(failed.ai_calls.length, 3); assert.equal(failed.image_generated, true); assert.equal(failed.text_requests, 2);
  scene = { reliable: true, protected_regions: [{ x: 0, y: .05, width: .33, height: .9 }], quiet_regions: [{ x: .37, y: 0, width: .63, height: 1 }] }; calls = [];
  const original = await ai.generateCopy(user, { ...body, mode: 'original' });
  assert.equal(calls.length, 1, 'Original analizza la foto nella stessa richiesta dei testi');
  assert.equal(original.graphic_url, undefined); assert.equal(original.composition_adjusted, true);
  assert.ok(calls[0].payload.text.format.schema.required.includes('composition'));
  assert.deepEqual(readdirSync(join(app.config.dataDir, 'uploads')), files);
});
