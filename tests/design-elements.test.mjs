import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync } from 'node:fs';
import { resolve } from 'node:path';
import { defaultDesign, normalizeDesign, designLayout, designBrief, FORMATS } from '../shared/templates.mjs';
import { normalizeElements, moveBox, resizeBox, scaleElement } from '../shared/designElements.mjs';
import { restoreStudioDraft } from '../src/lib/studioDraft.mjs';
import { createApp } from '../server/app.mjs';
import { uid, now, digest } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';

test('editor: coordinate e stili validati senza cambiare i post precedenti', () => {
  const original = defaultDesign(), before = structuredClone(original);
  assert.equal(Object.hasOwn(normalizeDesign(original), 'elements'), false);
  const elements = { heading: { x: .2, y: .1, width: .6, height: .3, font_size: 88, color: 'rgb(255, 80, 0)', align: 'center' }, logo: { x: 0, y: .7, width: .4, height: .12 } };
  const changed = normalizeDesign({ ...original, elements });
  assert.equal(changed.elements.heading.color, '#FF5000');
  assert.equal(designLayout(changed).heading.x, .2);
  assert.equal(designLayout(changed).logo.width, .4);
  assert.deepEqual(original, before);
  const customArea = designBrief(changed).reserved_areas.find(item => item.role === 'logo');
  assert.ok(customArea.x <= 0 && customArea.width >= .4);
  const restored = restoreStudioDraft(JSON.stringify({ version: 1, originalUrl: '/api/files/' + uid(), design: changed }), {});
  assert.deepEqual(restored.design, changed);
});

test('editor: rifiuta valori fuori limite, tipi errati e proprietà non previste', () => {
  const valid = { x: .1, y: .1, width: .3, height: .2 };
  for (const invalid of [null, [], { image: valid }, { logo: { ...valid, font_size: 80 } }, { heading: { ...valid, x: NaN } }, { logo: { ...valid, width: Infinity } }, { logo: { x: .2 } }, { logo: { ...valid, x: -.1 } }, { logo: { ...valid, width: 1 } }, { heading: { font_size: 601 } }, { heading: { font_size: '60' } }, { subtitle: { color: 'url(https://example.test)' } }, { subtitle: { align: 'bad' } }, { heading: { font_url: 'https://example.test/font' } }]) assert.throws(() => normalizeElements(invalid));
  assert.deepEqual(normalizeElements({ heading: { color: 'auto' } }), { heading: { color: 'auto' } });
});

test('editor: spostamento e ridimensionamento rimangono nella grafica e conservano le proporzioni', () => {
  for (const format of Object.keys(FORMATS)) {
    const design = { ...defaultDesign(), format }, box = { x: .75, y: .8, width: .2, height: .1 };
    for (const factor of [.01, .5, 2, 20]) {
      const resized = resizeBox(box, factor);
      assert.ok(resized.x >= 0 && resized.y >= 0 && resized.x + resized.width <= 1.000001 && resized.y + resized.height <= 1.000001);
      assert.ok(Math.abs(resized.width / resized.height - 2) < .001);
      assert.doesNotThrow(() => normalizeDesign(scaleElement(design, 'logo', box, factor)));
      const text = scaleElement(design, 'heading', box, factor, 80);
      assert.ok(text.elements.heading.font_size >= 12 && text.elements.heading.font_size <= 600);
      assert.doesNotThrow(() => normalizeDesign(text));
    }
    assert.deepEqual(moveBox(box, -5, 5), { ...box, x: 0, y: .9 });
  }
});

test('editor: il server conserva le modifiche del post e respinge accessi e asset di altri utenti', async t => {
  mkdirSync(resolve('work/tests'), { recursive: true });
  const aiCalls = [];
  const app = await createApp({ dbDriver: 'sqlite', dataDir: mkdtempSync(resolve('work/tests/editor-')), port: 0, origin: 'http://127.0.0.1:5180', localMode: true, scheduler: false, smtpHost: '', openaiKey: 'fixture', textModel: 'gpt-5.6-luna', fetchImpl: async (url, options) => {
    assert.equal(url, 'https://api.openai.com/v1/responses'); aiCalls.push(JSON.parse(options.body));
    return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ headline: 'Titolo di prova', graphic_subtitle: 'Testo', caption: 'Caption di collaudo', hashtags: '#test', composition: { reliable: true, protected_regions: [], quiet_regions: [{ x: 0, y: 0, width: 1, height: 1 }] } }) }] }] });
  } });
  t.after(() => app.close());
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const user = { id: uid() }, other = { id: uid() }, token = 'e'.repeat(64), foreignToken = 'f'.repeat(64);
  for (const [account, session] of [[user, token], [other, foreignToken]]) {
    await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'user','pro','{}',?)").run(account.id, account.id + '@example.test', now());
    await app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config, session), account.id, Date.now() + 3600000);
  }
  const request = async (path, data, method = 'POST', session = token) => {
    const response = await fetch(url + '/api' + path, { method, headers: { Origin: app.config.origin, Cookie: 'clicksocial_session=' + session, 'Content-Type': 'application/json' }, ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    return { status: response.status, body: await response.json() };
  };
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');
  const photo = await saveImage(app.db, app.config, user, png, 'fixture.png'), foreign = await saveImage(app.db, app.config, other, png, 'foreign.png');
  const design = defaultDesign();
  design.elements = { heading: { x: .1, y: .1, width: .6, height: .2, font_size: 54, color: '#C02030', align: 'center' }, logo: { x: .2, y: .8, width: .25, height: .08 } };
  const profileBefore = (await request('/auth/me', undefined, 'GET')).body;
  const saved = await request('/entities/Post', { title: 'Collaudo editor', headline: 'Un titolo', original_image_url: photo.file_url, image_url: photo.file_url, design, status: 'bozza' });
  assert.equal(saved.status, 200);
  const path = '/entities/Post/' + saved.body.id;
  assert.deepEqual((await request(path, undefined, 'GET')).body.design, design);
  assert.equal((await request(path, { design }, 'PATCH', foreignToken)).status, 404);
  assert.equal((await request(path, { design: { ...design, elements: { logo: { x: 2, y: 0, width: .2, height: .2 } } } }, 'PATCH')).status, 400);
  assert.equal((await request(path, { design: { ...design, brand: { ...design.brand, logos: { color: { url: foreign.file_url } } } } }, 'PATCH')).status, 404);
  assert.deepEqual((await request(path, undefined, 'GET')).body.design, design);
  assert.deepEqual((await request('/auth/me', undefined, 'GET')).body.brand_settings, profileBefore.brand_settings);
  assert.equal(aiCalls.length, 0, 'Le modifiche manuali non invocano l’AI');
  const generated = await request('/functions/generateCopy', { file_url: photo.file_url, mode: 'original', platform: 'instagram', design });
  assert.equal(generated.status, 200);
  assert.deepEqual(generated.body.design, design, 'La rigenerazione conserva la composizione personalizzata');
  assert.equal(aiCalls.length, 1);
  assert.match(aiCalls[0].input[0].content[0].text, /Composizione personalizzata/);
});
