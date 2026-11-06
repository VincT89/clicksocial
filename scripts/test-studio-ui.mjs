import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../server/app.mjs';
import { digest, now } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { defaultDesign } from '../shared/templates.mjs';
import { checkMediaUI } from './check-media-ui.mjs';

/** Browser separato e dati fittizi: nessun account, servizio AI o contenuto dell’installazione reale. */
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
const directory = resolve('work/tests', 'studio-ui-' + randomUUID());
mkdirSync(directory, { recursive: true });
const origin = 'https://clicksocial-editor.example.test';
let app, browser, page;
const errors = [], external = [];
let fixtureImage, compositionScene = { reliable: true, protected_regions: [], quiet_regions: [{ x: 0, y: 0, width: 1, height: 1 }] };
let fixtureCopy = { headline: 'Spazio alla foto', graphic_subtitle: 'Dettagli da raccontare', caption: 'Testo di collaudo', hashtags: '#test' };
const aiCalls = [];
const aiTextStyle = { heading: { font: 'DM Sans', weight: 800, font_size: 72, color: '#244A36', align: 'left', emphasis: { text: 'foto', font: 'Kaushan Script', weight: 400, scale: 1.6, color: '#254B30', separate_line: true }, backdrop: { style: 'none', color: '#FFF2DC', opacity: 0 } }, subtitle: { font: 'Bricolage Grotesque', weight: 400, font_size: 32, color: '#234034', align: 'left', backdrop: { style: 'none', color: '#FFFFFF', opacity: 0 } } };
try {
  app = await createApp({ useProjectEnv:false, dataDir: join(directory, 'data'), dbDriver: 'sqlite', origin, localMode: false, port: 0, scheduler: false,
    smtpHost: '', openaiKey: 'fixture-only', textModel: 'gpt-5.6-luna', imageModel: 'gpt-image-2', stripeKey: '', googleId: '', metaId: '', instagramId: '', tiktokKey: '', fetchImpl: async (url, options) => {
      if (url === 'https://api.openai.com/v1/images/edits') { aiCalls.push('image'); return Response.json({ data: [{ b64_json: fixtureImage }] }); }
      assert.equal(url, 'https://api.openai.com/v1/responses', 'Servizi esterni vietati nel collaudo');
      const request = JSON.parse(options.body), inspection = request.text.format.name === 'photo_composition'; aiCalls.push(inspection ? 'composition' : 'copy');
      const result = { ...(inspection ? {} : fixtureCopy), ...(inspection || request.text.format.schema.properties.composition ? { composition: compositionScene } : {}), ...(request.text.format.schema.properties.text_style ? { text_style: aiTextStyle } : {}) };
      return Response.json({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
    } });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const local = 'http://127.0.0.1:' + app.server.address().port;
  browser = await chromium.launch({ headless: true, ...(process.env.CLICKSOCIAL_BROWSER_CHANNEL ? { channel: process.env.CLICKSOCIAL_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, hasTouch: true });
  context.setDefaultTimeout(12000);
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin !== origin) { external.push(url.origin); return route.abort(); }
    try {
      const response = await context.request.fetch(local + url.pathname + url.search, { method: request.method(), headers: await request.allHeaders(), data: request.postDataBuffer() || undefined, maxRedirects: 0 });
      await route.fulfill({ response });
    } catch (error) { errors.push('Server locale: ' + error.message.split('\n')[0]); await route.abort(); }
  });
  page = await context.newPage();
  page.on('pageerror', error => errors.push(error.message));
  const images = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#E1DACB'; ctx.fillRect(0, 0, 1080, 1080);
    ctx.fillStyle = '#7A8879'; ctx.fillRect(650, 200, 320, 580); ctx.fillStyle = '#B5BDA7'; ctx.fillRect(700, 250, 220, 240);
    const photo = canvas.toDataURL('image/png').split(',')[1];
    ctx.fillStyle = '#E1DACB'; ctx.fillRect(0, 0, 1080, 1080); ctx.fillStyle = '#7A8879'; ctx.fillRect(110, 200, 320, 580); ctx.fillStyle = '#B5BDA7'; ctx.fillRect(160, 250, 220, 240);
    const leftPhoto = canvas.toDataURL('image/png').split(',')[1];
    canvas.width = 360; canvas.height = 120;
    ctx.fillStyle = '#322868'; ctx.fillRect(0, 0, 360, 120); ctx.fillStyle = '#FFFFFF'; ctx.font = 'bold 62px sans-serif'; ctx.fillText('LOGO', 24, 82);
    return { photo, leftPhoto, logo: canvas.toDataURL('image/png').split(',')[1] };
  });
  const user = { id: randomUUID(), plan: 'pro', role: 'user' }, session = randomBytes(32).toString('hex');
  await app.db.prepare("INSERT INTO users(id,email,verified,plan,profile,created_at) VALUES (?,?,1,'pro','{}',?)").run(user.id, 'studio-test@example.test', now());
  await app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config, session), user.id, Date.now() + 3600000);
  await context.addCookies([{ name: 'clicksocial_session', value: session, url: origin, httpOnly: true, secure: true, sameSite: 'Lax' }]);
  const photo = await saveImage(app.db, app.config, user, Buffer.from(images.photo, 'base64'), 'collaudo.png');
  const logo = await saveImage(app.db, app.config, user, Buffer.from(images.logo, 'base64'), 'logo-collaudo.png');
  const design = defaultDesign(); design.brand.logos.color = { url: logo.file_url, background: 'none' };
  await app.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({ company_name: 'Attività di collaudo', brand_settings: design.brand }), user.id);
  const postId = randomUUID(), lockedId = randomUUID(), legacyId = randomUUID();
  const data = { title: 'Collaudo Studio', headline: 'Una nuova idea', graphic_subtitle: 'Dettagli da raccontare', caption: 'Testo di collaudo', platform: 'instagram', image_url: photo.file_url, original_image_url: photo.file_url, mode: 'original', status: 'bozza', design };
  const longCaption = 'Una descrizione di collaudo che occupa più righe sul telefono. '.repeat(12).trim() + '\n\n#prova';
  for (const [id, post] of [[postId, data], [lockedId, { ...data, status: 'pubblicato', caption: longCaption }], [legacyId, { ...data, design: null }]]) await app.db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(id, user.id, JSON.stringify(post), now(), now());
  const ready = async () => { await page.getByRole('button', { name: 'Sposta titolo', exact: true }).waitFor(); await page.evaluate(() => document.fonts.ready); };
  const boxOf = role => page.getByRole('button', { name: 'Sposta ' + role, exact: true }).boundingBox();
  const settle = () => page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const open = async tab => { await page.getByRole('button', { name: 'Personalizza il post' }).click(); await page.getByRole('dialog').waitFor(); if (tab) await page.getByRole('button', { name: tab, exact: true }).click(); };
  const close = async () => { await page.getByRole('button', { name: 'Chiudi impostazioni', exact: true }).click(); await page.getByRole('dialog').waitFor({ state: 'hidden' }); await settle(); };
  await checkMediaUI({ page, origin, directory, images });
  console.log('Libreria media e attribuzione sotto il marchio verificate su iPhone e desktop.');
  await page.goto(origin + '/studio?id=' + postId); await ready();
  const mainNav = page.getByRole('navigation', { name: 'Sezioni dell’app', exact: true });
  assert.deepEqual(await mainNav.getByRole('link').allTextContents(), ['Home', 'Calendario', 'Crea post', 'Statistiche', 'Profilo', 'Libreria media', 'Preferenze', 'Assistenza']);
  assert.equal(await mainNav.getByRole('button', { name: 'Gestione' }).count(), 0);
  assert.equal(await page.getByRole('alert').count(), 0);
  let before = await boxOf('titolo');
  await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2); await page.mouse.down(); await page.mouse.move(before.x + before.width / 2 + 40, before.y + before.height / 2 + 20, { steps: 8 }); await page.mouse.up(); await settle();
  let after = await boxOf('titolo');
  assert.ok(after.x > before.x + 30 && after.y > before.y + 10, 'Trascinamento titolo');
  const handle = await page.getByRole('button', { name: 'Ridimensiona titolo' }).boundingBox();
  await page.mouse.move(handle.x + handle.width / 2, handle.y + handle.height / 2); await page.mouse.down(); await page.mouse.move(handle.x + handle.width / 2 + 35, handle.y + handle.height / 2 + 22, { steps: 8 }); await page.mouse.up(); await settle();
  assert.ok((await boxOf('titolo')).width > after.width + 15, 'Ridimensionamento titolo');
  await page.getByRole('button', { name: 'Sposta titolo', exact: true }).focus();
  before = await boxOf('titolo'); await page.keyboard.press('ArrowRight'); await settle(); assert.ok((await boxOf('titolo')).x > before.x, 'Tastiera per spostare');
  await open('Grafica');
  await page.getByLabel('Colore della scritta', { exact: true }).focus(); await page.keyboard.press('Tab');
  assert.ok(await page.getByRole('switch', { name: 'Scegli automaticamente un colore leggibile' }).isChecked(), 'Il solo focus non deve disattivare il colore automatico');
  await selectValue(page, page.getByLabel('Font della scritta', { exact: true }), 'DM Sans');
  await page.getByLabel('Colore della scritta', { exact: true }).fill('#B42030'); await page.keyboard.press('Tab');
  await selectValue(page, page.getByLabel('Allineamento', { exact: true }), 'center');
  await page.getByLabel('Dimensione del testo (pixel)', { exact: true }).fill('90');
  await selectValue(page, page.getByLabel('Elemento da modificare'), 'subtitle');
  await page.getByLabel('Testo di supporto', { exact: true }).fill('Un testo personalizzato');
  await selectValue(page, page.getByLabel('Font della scritta', { exact: true }), 'Bricolage Grotesque');
  await page.getByLabel('Colore della scritta', { exact: true }).fill('#102C64'); await page.keyboard.press('Tab');
  await selectValue(page, page.getByLabel('Elemento da modificare'), 'logo');
  const backdropOpacity = () => page.getByRole('slider', { name: /^Intensità dello sfondo:/ });
  const backdropSize = () => page.getByRole('slider', { name: /^Dimensione dello sfondo:/ });
  await backdropOpacity().press('Home'); await backdropSize().press('End');
  await close();
  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  const logoBeforeBackdrop = await boxOf('logo'), backdropFrame = await page.locator('.studio-preview-frame').boundingBox();
  const backdropPoint = { x: (logoBeforeBackdrop.x - logoBeforeBackdrop.width * .25 - backdropFrame.x) / backdropFrame.width, y: (logoBeforeBackdrop.y + logoBeforeBackdrop.height / 2 - backdropFrame.y) / backdropFrame.height };
  const readBackdropPixel = () => page.locator('.studio-preview-frame canvas').evaluate((canvas, point) => Array.from(canvas.getContext('2d').getImageData(Math.round(point.x * canvas.width), Math.round(point.y * canvas.height), 1, 1).data), backdropPoint);
  const transparentPixel = await readBackdropPixel();
  await open('Grafica'); await backdropOpacity().press('End'); await close();
  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  assert.notDeepEqual(await readBackdropPixel(), transparentPixel, 'L’intensità massima disegna lo sfondo anche quando quello automatico non serviva');
  assert.deepEqual(await boxOf('logo'), logoBeforeBackdrop, 'Lo sfondo non ridimensiona il marchio');
  await open('Grafica'); await backdropSize().press('Home'); await close();
  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  assert.deepEqual(await readBackdropPixel(), transparentPixel, 'Ridurre lo sfondo libera la fotografia fuori dal logo');
  await open('Grafica'); await page.getByRole('button', { name: 'Ripristina sfondo automatico', exact: true }).click();
  assert.equal(await backdropSize().inputValue(), '100');
  assert.match(await page.locator('label[for="logo-backdrop-opacity"]').innerText(), /automatica/);
  await settle(); await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  const setRange = async (slider, value) => {
    const min = Number(await slider.getAttribute('min')), step = Number(await slider.getAttribute('step')), id = await slider.getAttribute('id');
    await slider.press('Home'); await settle();
    for (let next = min + step; next <= value; next += step) { await slider.press('ArrowRight'); await settle(); }
    await page.waitForFunction(({ id, value }) => Number(document.getElementById(id)?.value) === value, { id, value });
  };
  await setRange(backdropOpacity(), 70); await setRange(backdropSize(), 160);
  assert.equal(await backdropOpacity().inputValue(), '70'); assert.equal(await backdropSize().inputValue(), '160');
  await close();
  await open('Foto'); await page.getByRole('button', { name: 'Vivace', exact: true }).click(); await close();
  await page.getByLabel('Descrizione per Instagram', { exact: true }).fill('Descrizione modificata nella schermata');
  await page.screenshot({ path: join(directory, 'studio-desktop.png') });
  console.log('Desktop: trascinamento, ridimensionamento, tastiera, font, colori e pannello verificati.');

  const viewports = [{ width: 360, height: 740 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 430, height: 932 }, { width: 320, height: 568 }, { width: 844, height: 390 }, { width: 768, height: 1024 }];
  for (const viewport of viewports) {
    await page.setViewportSize(viewport); await settle();
    const dimensions = await page.evaluate(() => ({ width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
    assert.ok(dimensions.scrollWidth <= dimensions.width + 1, 'Larghezza della pagina: ' + JSON.stringify(viewport));
    assert.ok(dimensions.scrollHeight <= dimensions.height + 1, 'Altezza della pagina: ' + JSON.stringify(viewport));
    const captionBox = await page.locator('#post-caption').boundingBox(), photoFrame = await page.locator('.studio-preview-frame').boundingBox();
    assert.ok(captionBox.y >= 0 && captionBox.height >= 44 && captionBox.y + captionBox.height <= viewport.height, 'Descrizione del post salvato visibile: ' + JSON.stringify(viewport));
    assert.ok(photoFrame.width >= 100 && photoFrame.height >= 100, 'La foto rimane visibile: ' + JSON.stringify(viewport));
    const gear = await page.getByRole('button', { name: 'Personalizza il post' }).boundingBox();
    assert.ok(gear.x >= 0 && gear.y >= 0 && gear.y + gear.height <= viewport.height, 'Ingranaggio visibile');
    assert.ok(gear.y >= photoFrame.y + photoFrame.height - 1, 'Personalizza si trova sotto la foto');
    await open('Grafica');
    const dialog = await page.getByRole('dialog').boundingBox(); assert.ok(dialog.width <= viewport.width && dialog.y >= 0 && dialog.y + dialog.height <= viewport.height + 1, 'Drawer nella schermata');
    assert.ok(await page.getByRole('button', { name: 'Chiudi impostazioni' }).isVisible());
    if (viewport.width === 390) { await backdropOpacity().scrollIntoViewIfNeeded(); await page.screenshot({ path: join(directory, 'studio-mobile-drawer.png') }); }
    await page.keyboard.press('Escape'); await page.getByRole('dialog').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Personalizza il post');
    if (viewport.width === 390) await page.screenshot({ path: join(directory, 'studio-mobile.png') });
  }
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  const cdp = await context.newCDPSession(page);
  before = await boxOf('logo');
  const start = { x: before.x + before.width / 2, y: before.y + before.height / 2 };
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ ...start, id: 1 }] });
  for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: start.x - i * 6, y: start.y - i * 5, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await settle();
  after = await boxOf('logo'); assert.ok(after.x < before.x - 30 && after.y < before.y - 25, 'Trascinamento touch del logo');
  await cdp.detach();
  await page.getByRole('button', { name: 'Sposta logo', exact: true }).focus(); await page.keyboard.press('+'); await settle();
  assert.ok((await boxOf('logo')).width > after.width, 'Ridimensionamento del logo senza mouse');
  assert.equal(await page.getByRole('dialog', { name: 'Anteprima del post' }).count(), 0, 'Trascinare il logo non apre la foto a tutto schermo');
  console.log('Schermi desktop e mobile: nessuno scorrimento della pagina; touch, tastiera e chiusura del drawer verificati.');

  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  const preview = await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  const saved = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(postId)).data);
  assert.equal(saved.design.elements.heading.color, '#B42030'); assert.equal(saved.design.elements.heading.align, 'center');
  assert.equal(saved.design.brand.fonts.heading.family, 'DM Sans'); assert.equal(saved.design.brand.fonts.body.family, 'Bricolage Grotesque');
  assert.equal(saved.design.elements.subtitle.color, '#102C64'); assert.ok(saved.design.elements.logo.width > 0);
  assert.equal(saved.design.elements.logo.backdrop_opacity, .7); assert.equal(saved.design.elements.logo.backdrop_size, 1.6);
  assert.equal(saved.caption, 'Descrizione modificata nella schermata'); assert.equal(saved.graphic_subtitle, 'Un testo personalizzato');
  assert.deepEqual(readFileSync(join(app.config.dataDir, 'uploads', saved.image_url.split('/').pop())), Buffer.from(preview, 'base64'), 'Esportazione identica all’anteprima, senza maniglie');
  const profile = JSON.parse((await app.db.prepare('SELECT profile FROM users WHERE id=?').get(user.id)).profile);
  assert.deepEqual(profile.brand_settings, design.brand, 'Il post non modifica il brand dell’account');
  await page.goto(origin + '/studio?id=' + postId); await ready();
  await open('Grafica'); await selectValue(page, page.getByLabel('Elemento da modificare'), 'heading');
  assert.equal(await selectedValue(page, page.getByLabel('Font della scritta', { exact: true })), 'DM Sans');
  assert.equal(await page.getByLabel('Colore della scritta', { exact: true }).inputValue(), '#B42030'); await close();
  await open('Grafica'); await selectValue(page, page.getByLabel('Elemento da modificare'), 'logo');
  assert.equal(await backdropOpacity().inputValue(), '70'); assert.equal(await backdropSize().inputValue(), '160'); await close();
  console.log('Salvataggio e riapertura: composizione, font, colori, immagine esportata e isolamento del brand verificati.');

  for (const [format, width, height] of [['4:5', 1080, 1350], ['9:16', 1080, 1920], ['16:9', 1920, 1080], ['1:1', 1080, 1080]]) {
    await open('Grafica'); await page.getByText('Formato e schemi iniziali', { exact: true }).click();
    await selectValue(page, page.getByLabel('Formato', { exact: true }), format); await close();
    await page.waitForFunction(({ width, height }) => { const canvas = document.querySelector('.studio-preview-frame canvas'); return canvas?.width === width && canvas?.height === height; }, { width, height });
    const frame = await page.locator('.studio-preview-frame').boundingBox();
    assert.ok(Math.abs(frame.width / frame.height - width / height) < .01, 'Proporzioni anteprima ' + format);
    assert.equal(await page.getByRole('alert').count(), 0, 'Nessun errore nel formato ' + format);
  }
  await open('Grafica'); await selectValue(page, page.getByLabel('Elemento da modificare'), 'heading');
  await page.getByText('Carica un altro font', { exact: true }).click();
  await page.getByLabel('Carica font della scritta', { exact: true }).setInputFiles(resolve('public/fonts/DM-Sans.ttf'));
  await page.getByLabel('Font della scritta', { exact: true }).filter({ hasText: '(caricato)' }).waitFor();
  assert.equal(await selectedValue(page, page.getByLabel('Font della scritta', { exact: true })), 'custom');
  await page.waitForFunction(() => !document.querySelector('button[aria-label="Chiudi impostazioni"]').disabled);
  await close(); await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  const withFont = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(postId)).data);
  assert.match(withFont.design.brand.fonts.heading.url, /^\/api\/files\/[a-f0-9-]{36}$/);
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id=?').get(user.id)).count, 3);
  console.log('Quattro formati e caricamento di un font privato dal drawer verificati.');

  await page.goto(origin + '/studio?id=' + lockedId); await ready();
  assert.equal(await page.getByRole('button', { name: 'Salva in bozze', exact: true }).count(), 0);
  assert.ok(await page.getByRole('button', { name: 'Sposta logo', exact: true }).isDisabled());
  await page.getByRole('button', { name: 'Leggi tutto', exact: true }).click();
  assert.equal(await page.getByLabel('Testo e hashtag', { exact: true }).getAttribute('readonly'), '');
  assert.equal(await page.getByRole('button', { name: 'Applica al post' }).count(), 0);
  await page.getByRole('button', { name: 'Chiudi descrizione' }).click();
  await page.goto(origin + '/studio?id=' + legacyId); await page.getByRole('button', { name: 'Personalizza il post' }).waitFor();
  await open('Grafica'); await page.getByRole('button', { name: 'Applica un template alla foto originale' }).click(); await close(); await ready();
  await page.goto(origin + '/studio?new=1'); await open('Grafica');
  await page.getByLabel('Titolo grafica', { exact: true }).fill('Preparato prima della foto');
  await selectValue(page, page.getByLabel('Font della scritta', { exact: true }), 'DM Sans');
  await page.getByLabel('Colore della scritta', { exact: true }).fill('#165A30'); await page.keyboard.press('Tab'); await close();
  await page.locator('[data-tour="studio-uploader"] input[type="file"]').setInputFiles({ name: 'nuova-foto.png', mimeType: 'image/png', buffer: Buffer.from(images.leftPhoto, 'base64') });
  await ready(); await open('Grafica');
  assert.equal(await page.getByLabel('Titolo grafica', { exact: true }).inputValue(), 'Preparato prima della foto');
  assert.equal(await page.getByLabel('Colore della scritta', { exact: true }).inputValue(), '#165A30');
  assert.equal(await selectedValue(page, page.getByLabel('Font della scritta', { exact: true })), 'DM Sans'); await close();
  assert.equal(aiCalls.length, 0, 'Le modifiche manuali non chiamano l’AI');
  fixtureImage = images.leftPhoto;
  compositionScene = { reliable: true, protected_regions: [{ x: .10, y: .18, width: .30, height: .55 }], quiet_regions: [{ x: .43, y: 0, width: .57, height: 1 }] };
  const generate = async () => {
    const response = page.waitForResponse(response => response.url().endsWith('/api/functions/generateCopy'));
    if (await page.locator('.studio-settings-drawer').isVisible()) await close();
    await page.locator('[data-tour="studio-generate"]').click();
    const result = await response;
    await page.getByRole('button', { name: 'Salva in bozze', exact: true }).waitFor();
    await page.waitForFunction(() => !document.querySelector('[data-tour="studio-save"]').disabled);
    await page.locator('.studio-editor[aria-busy="false"]').waitFor(); await settle();
    return { status: result.status(), body: await result.json(), request: result.request().postDataJSON() };
  };
  await open('Testi e AI');
  await page.getByRole('button', { name: /^Originale/ }).click();
  await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).uncheck();
  const original = await generate(); assert.equal(original.status, 200); assert.equal(original.body.composition_adjusted, true);
  assert.deepEqual(aiCalls, ['copy']);
  const frame = await page.locator('.studio-preview-frame').boundingBox(), heading = await boxOf('titolo');
  assert.ok((heading.x - frame.x) / frame.width >= .43, 'L’anteprima sposta il titolo nello spazio libero');
  assert.equal(original.body.design.elements.heading.color, '#165A30');
  assert.equal(original.body.design.brand.fonts.heading.family, 'DM Sans');
  const pixel = await page.locator('.studio-preview-frame canvas').evaluate(canvas => Array.from(canvas.getContext('2d').getImageData(420, 600, 1, 1).data));
  assert.deepEqual(pixel, [122, 136, 121, 255], 'Il soggetto resta intatto anche vicino al margine delle scritte');
  await page.screenshot({ path: join(directory, 'composition-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 900 }); await settle();
  await page.screenshot({ path: join(directory, 'composition-desktop.png') });
  await open('Testi e AI'); await page.getByRole('button', { name: /^Foto creativa/ }).click();
  const creative = await generate(); assert.equal(creative.status, 200); assert.ok(creative.body.graphic_url);
  assert.deepEqual(aiCalls, ['copy', 'copy', 'image', 'composition']);
  const generatedPreview = await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  compositionScene = { reliable: true, protected_regions: [{ x: 0, y: 0, width: 1, height: 1 }], quiet_regions: [] };
  await open('Testi e AI'); const rejected = await generate();
  assert.equal(rejected.status, 502);
  assert.match(rejected.body.error || rejected.body.message, /spazio libero sufficiente/);
  assert.equal(await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]), generatedPreview, 'Il fallimento conserva l’ultima composizione riuscita');
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  const generatedPost = (await app.db.prepare('SELECT data FROM posts WHERE user_id=?').all(user.id)).map(row => JSON.parse(row.data)).find(post => post.headline === 'Spazio alla foto');
  assert.deepEqual(generatedPost.design, creative.body.design);
  assert.deepEqual(readFileSync(join(app.config.dataDir, 'uploads', generatedPost.image_url.split('/').pop())), Buffer.from(generatedPreview, 'base64'));
  await page.goto(origin + '/studio?id=' + postId); await ready(); await open('Grafica');
  for (const [role, x, y] of [['heading', '12', '20'], ['subtitle', '12', '45'], ['logo', '15', '24']]) {
    await selectValue(page, page.getByLabel('Elemento da modificare'), role);
    await page.getByLabel('Orizzontale (%)', { exact: true }).fill(x);
    await page.getByLabel('Verticale (%)', { exact: true }).fill(y);
  }
  await close();
  const manuallyPlaced = await Promise.all(['titolo', 'testo di supporto', 'logo'].map(boxOf));
  await open('Testi e AI');
  const manualGeneration = await generate(); assert.equal(manualGeneration.status, 200); assert.equal(manualGeneration.body.composition_adjusted, false);
  assert.equal(manualGeneration.body.design.elements.logo.backdrop_opacity, .7); assert.equal(manualGeneration.body.design.elements.logo.backdrop_size, 1.6);
  for (const [index, role] of ['titolo', 'testo di supporto', 'logo'].entries()) {
    const actual = await boxOf(role);
    assert.ok(Math.abs(actual.x - manuallyPlaced[index].x) < 1 && Math.abs(actual.y - manuallyPlaced[index].y) < 1, 'Genera rispetta la posizione manuale di ' + role);
  }
  await page.screenshot({ path: join(directory, 'manual-composition.png') });
  await open('Testi e AI');
  assert.ok(!await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).isChecked());
  await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).check();
  const styled = await generate(); assert.equal(styled.status, 200);
  assert.equal(styled.body.design.elements.heading.color, '#244A36');
  assert.equal(styled.body.design.brand.fonts.heading.weight, 800);
  assert.equal(styled.body.design.elements.heading.x, manualGeneration.body.design.elements.heading.x);
  await open('Grafica'); await selectValue(page, page.getByLabel('Elemento da modificare'), 'heading');
  assert.equal(await selectedValue(page, page.getByLabel('Font della scritta', { exact: true })), 'DM Sans');
  assert.equal(await selectedValue(page, page.getByLabel('Spessore del carattere', { exact: true })), '800');
  assert.equal(await page.getByLabel('Colore della scritta', { exact: true }).inputValue(), '#244A36');
  assert.ok(await page.getByRole('switch', { name: 'Parola in evidenza', exact: true }).isChecked());
  assert.equal(await selectedValue(page, page.getByLabel('Font della parola', { exact: true })), 'Kaushan Script');
  assert.equal(await page.getByLabel('Sfondo della scritta', { exact: true }).count(), 0);
  await page.getByLabel('Colore della parola', { exact: true }).fill('#193520'); await page.keyboard.press('Tab');
  await page.getByRole('switch', { name: 'Parola su una riga dedicata', exact: true }).uncheck();
  assert.equal(await page.getByRole('slider', { name: /^Intensità della pennellata:/ }).count(), 0);

  await page.getByLabel('Colore della scritta', { exact: true }).fill('#4C2244'); await page.keyboard.press('Tab'); await close();
  await open('Testi e AI'); await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).uncheck();
  const kept = await generate(); assert.equal(kept.status, 200); assert.equal(kept.body.design.elements.heading.color, '#4C2244');
  assert.equal(kept.body.design.elements.heading.emphasis.color, '#193520');
  assert.equal(kept.body.design.elements.heading.emphasis.separate_line, false);
  assert.equal(kept.body.design.elements.heading.backdrop.opacity, 0);
  assert.equal(kept.body.design.transparent_overlays, true);
  await open('Testi e AI'); await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).check(); await close();
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  await page.goto(origin + '/studio?id=' + postId); await ready(); await open('Testi e AI');
  assert.ok(await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).isChecked());
  await page.setViewportSize({ width: 390, height: 844 }); await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: join(directory, 'text-style-mobile.png') }); await close();
  await open('Grafica'); await selectValue(page, page.getByLabel('Elemento da modificare'), 'heading');
  assert.equal(await page.getByLabel('Colore della parola', { exact: true }).inputValue(), '#193520');
  await page.getByRole('switch', { name: 'Parola in evidenza', exact: true }).uncheck(); await close(); await ready();
  console.log('Generazioni simulate Original e Creative: spazi liberi, conservazione del soggetto, stili, errori e salvataggio verificati.');
  /** Il percorso principale funziona senza aprire la rotellina; il social è simulato e non viene mai contattato. */
  compositionScene = { reliable: true, protected_regions: [{ x: .08, y: .08, width: .84, height: .5 }], quiet_regions: [], layout: { heading: null, subtitle: null, logo: { x: .65, y: .77, width: .25, height: .13 } } };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin + '/studio?new=1');
  /** La risposta immagini contiene già le scritte: la fixture verifica il compositing, non la qualità artistica dell’AI. */
  fixtureImage = await page.evaluate(({ photo, title }) => new Promise(resolve => {
    const image = new Image(); image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
      const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
      ctx.fillStyle = '#18312B'; ctx.font = 'bold 78px sans-serif'; ctx.fillText(title, 70, 130);
      resolve(canvas.toDataURL('image/png').split(',')[1]);
    }; image.src = 'data:image/png;base64,' + photo;
  }), { photo: images.leftPhoto, title: fixtureCopy.headline });
  await page.locator('[data-tour="studio-uploader"] input[type="file"]').setInputFiles({ name: 'foto-flusso-semplice.png', mimeType: 'image/png', buffer: Buffer.from(images.leftPhoto, 'base64') });
  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  assert.equal(await page.locator('.studio-settings-drawer').count(), 0);
  await page.locator('#post-context').fill('Racconta la sagra');
  assert.equal(await page.getByRole('button', { name: 'Pubblica', exact: true }).count(), 0);
  const defaultRequest = page.waitForRequest(request => request.url().endsWith('/api/functions/generateCopy'));
  const simpleResult = await generate(), simpleBody = (await defaultRequest).postDataJSON();
  assert.equal(simpleResult.status, 200);
  assert.equal(simpleBody.mode, 'graphic'); assert.equal(simpleBody.design.ai_text_style, true); assert.equal(simpleBody.design.transparent_overlays, true);
  assert.equal(simpleResult.body.design.text_mode, 'image'); assert.equal(simpleResult.body.generated_mode, 'graphic');
  const readyGraphic = async () => { await page.getByRole('button', { name: 'Sposta logo', exact: true }).waitFor(); await page.locator('.studio-editor[aria-busy="false"]').waitFor(); await settle(); };
  await readyGraphic();
  assert.equal(await page.getByRole('button', { name: 'Sposta titolo', exact: true }).count(), 0);
  assert.equal(await page.getByRole('button', { name: 'Sposta testo di supporto', exact: true }).count(), 0);
  const unchangedGraphic = await page.locator('.studio-preview-frame canvas').evaluate((canvas, bytes) => new Promise(resolve => {
    const image = new Image(); image.onload = () => {
      const expected = document.createElement('canvas'); expected.width = expected.height = 1080;
      expected.getContext('2d').drawImage(image, 0, 0);
      const a = expected.getContext('2d').getImageData(0, 0, 1080, 650).data, b = canvas.getContext('2d').getImageData(0, 0, 1080, 650).data;
      resolve(a.every((value, i) => value === b[i]));
    }; image.src = 'data:image/png;base64,' + bytes;
  }), fixtureImage);
  assert.equal(unchangedGraphic, true, 'La grafica AI mantiene i pixel e le scritte originali senza aggiungere testi');
  assert.equal(await page.getByLabel('Descrizione per Instagram', { exact: true }).inputValue(), 'Testo di collaudo\n\n#test');
  assert.equal(await page.locator('.studio-settings-drawer').count(), 0);
  assert.equal(await page.locator('#post-context').isVisible(), false);
  assert.equal(await page.locator('.studio-request-text').innerText(), 'Racconta la sagra');
  for (const selector of ['#post-caption', '[data-tour="studio-publish"]', '[data-tour="studio-save"]']) {
    assert.ok(await page.locator(selector).evaluate(element => {
      const box = element.getBoundingClientRect();
      return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2));
    }), 'Subito dopo Genera, sullo schermo da 390 px: ' + selector);
  }
  await page.waitForFunction(() => !document.querySelector('[data-sonner-toast][data-visible="true"]'));
  const insetSession = await context.newCDPSession(page);
  const noInsets = { top: 0, right: 0, bottom: 0, left: 0 };
  for (const viewport of [{ width: 1280, height: 900 }, ...viewports]) {
    const insets = viewport.width === 844 ? { top: 0, right: 47, bottom: 21, left: 47 }
      : [390, 430].includes(viewport.width) ? { top: 47, right: 0, bottom: 34, left: 0 } : noInsets;
    await page.setViewportSize(viewport);
    await insetSession.send('Emulation.setSafeAreaInsetsOverride', { insets });
    await settle();
    for (const target of ['studio-generate', 'studio-save', 'studio-publish', 'studio-settings']) {
      const area = await page.locator('[data-tour="' + target + '"]').boundingBox();
      assert.ok(area && area.x >= 0 && area.y >= 0 && area.x + area.width <= viewport.width + 1 && area.y + area.height <= viewport.height + 1, 'Azione visibile: ' + target + ' ' + JSON.stringify(viewport));
      assert.ok(await page.locator('[data-tour="' + target + '"]').evaluate(element => { const box = element.getBoundingClientRect(); return element.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2)); }), 'Azione raggiungibile: ' + target + ' ' + JSON.stringify(viewport));
    }
    const frame = await page.locator('.studio-preview-frame').boundingBox(); assert.ok(frame.width >= 60 && frame.height >= 60, 'Foto visibile');
    const [caption, publish, save, revision, nav] = await Promise.all([
      page.locator('#post-caption').boundingBox(), page.locator('[data-tour="studio-publish"]').boundingBox(), page.locator('[data-tour="studio-save"]').boundingBox(),
      page.locator('.studio-revision').boundingBox(), page.locator('.mobile-bottom-nav').boundingBox(),
    ]);
    assert.ok(publish.y >= caption.y + caption.height - 1 && Math.abs(publish.y - save.y) < 1 && publish.x < save.x, 'Descrizione seguita dalla riga Pubblica / Salva: ' + JSON.stringify({viewport, caption, publish, save}));
    assert.ok(publish.y + publish.height <= revision.y + 1 && save.y + save.height <= (nav?.y ?? viewport.height) + 1, 'Le azioni principali precedono la richiesta e restano sopra la navigazione');
    if (insets.bottom) {
      const tab = await mainNav.getByRole('link', { name: 'Calendario' }).boundingBox();
      assert.ok(nav && tab.y >= nav.y && tab.y + tab.height <= viewport.height - insets.bottom + 1);
      assert.ok(publish.x >= insets.left && save.x + save.width <= viewport.width - insets.right + 1);
    }
    assert.ok(await page.evaluate(() => document.documentElement.scrollHeight <= innerHeight + 1 && document.documentElement.scrollWidth <= innerWidth + 1));
    await page.screenshot({ path: join(directory, 'simple-' + viewport.width + 'x' + viewport.height + '.png') });
  }
  await insetSession.send('Emulation.setSafeAreaInsetsOverride', { insets: noInsets });
  await insetSession.detach();
  await page.setViewportSize({ width: 390, height: 844 });
  const callsBeforeReview = aiCalls.length;
  const caption = page.getByLabel('Descrizione per Instagram', { exact: true });
  await caption.fill('Oggi caffè a 1 euro');
  const shortHeight = (await caption.boundingBox()).height;
  assert.ok(shortHeight >= 44 && shortHeight < 54);
  assert.equal(await page.getByRole('button', { name: 'Leggi e modifica' }).count(), 0);
  await caption.fill(longCaption);
  await page.getByRole('button', { name: 'Leggi e modifica', exact: true }).waitFor();
  const longHeight = (await caption.boundingBox()).height;
  assert.ok(longHeight > shortHeight && longHeight <= 112, 'Fino a quattro righe, con entrambe le azioni in vista');
  await page.getByRole('button', { name: 'Leggi e modifica' }).tap();
  const captionDialog = page.getByRole('dialog', { name: 'Descrizione per Instagram' });
  const fullText = captionDialog.getByLabel('Testo e hashtag', { exact: true });
  assert.equal(await fullText.inputValue(), longCaption);
  await fullText.fill('Modifica annullata'); await captionDialog.getByRole('button', { name: 'Chiudi descrizione' }).click();
  assert.equal(await caption.inputValue(), longCaption);
  await page.getByRole('button', { name: 'Leggi e modifica' }).tap(); await fullText.fill('Testo di collaudo\n\n#test');
  await captionDialog.getByRole('button', { name: 'Applica al post' }).tap();
  for (const name of ['Facebook', 'Instagram']) {
    await open('Testi e AI'); await page.getByRole('button', { name, exact: true }).click(); await close();
    assert.equal(await page.getByLabel('Descrizione per ' + name, { exact: true }).inputValue(), 'Testo di collaudo\n\n#test');
  }
  await mainNav.getByRole('link', { name: 'Home', exact: true }).click();
  await page.getByRole('link', { name: 'Libreria media', exact: true }).click();
  await page.waitForURL('**/media');
  await page.getByRole('heading', { name: 'Libreria media', exact: true }).waitFor();
  assert.equal(await page.getByRole('heading', { name: 'Libreria media', exact: true }).count(), 1);
  await mainNav.getByRole('link', { name: 'Crea', exact: true }).click();
  await readyGraphic();
  assert.equal(await caption.inputValue(), 'Testo di collaudo\n\n#test', 'La barra dell’app conserva la bozza');
  await page.locator('.studio-revision summary').click();
  await page.locator('#post-context').fill('Racconta i sapori del borgo');
  await page.locator('.studio-revision summary').click();
  const visiblePreview = await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL());
  await page.getByRole('button', { name: 'Apri anteprima a tutto schermo' }).tap();
  const largePreview = page.getByRole('dialog', { name: 'Anteprima del post' });
  await largePreview.waitFor();
  assert.equal(await largePreview.locator('canvas').evaluate(canvas => canvas.toDataURL()), visiblePreview);
  await largePreview.getByRole('button', { name: 'Chiudi anteprima' }).tap();
  await largePreview.waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#post-caption').inputValue(), 'Testo di collaudo\n\n#test');
  assert.equal(aiCalls.length, callsBeforeReview, 'Modifica richiesta e anteprima non avviano una generazione');
  await open('Testi e AI');
  assert.equal(await page.getByLabel('Titolo sulla foto', { exact: true }).getAttribute('readonly'), '');
  assert.equal(await page.getByRole('switch', { name: 'Stile testo automatico', exact: true }).count(), 0);
  await close(); await open('Grafica');
  assert.deepEqual(await selectOptions(page, page.getByLabel('Elemento da modificare')), ['logo']);
  assert.equal(await page.getByLabel('Font della scritta', { exact: true }).count(), 0);
  await page.getByText('Formato e schemi iniziali', { exact: true }).click();
  await selectValue(page, page.getByLabel('Formato', { exact: true }), '4:5'); await close();
  await page.getByText('Premi Rigenera per creare la grafica nel nuovo formato senza tagliare le scritte.', { exact: true }).waitFor();
  await open('Grafica'); await page.getByText('Formato e schemi iniziali', { exact: true }).click();
  await selectValue(page, page.getByLabel('Formato', { exact: true }), '1:1'); await close(); await readyGraphic();
  const fixedLogo = await boxOf('logo');
  await page.getByRole('button', { name: 'Sposta logo', exact: true }).focus(); await page.keyboard.press('ArrowLeft'); await settle();
  assert.ok((await boxOf('logo')).x < fixedLogo.x, 'Il logo resta spostabile sulla grafica integrata');
  const logoBeforeScale = await boxOf('logo'); await page.keyboard.press('+'); await settle();
  assert.ok((await boxOf('logo')).width > logoBeforeScale.width, 'Il logo resta ridimensionabile sulla grafica integrata');
  await open('Testi e AI'); await page.getByRole('button', { name: /^Originale/ }).click(); await close(); await readyGraphic();
  assert.equal(await page.getByRole('button', { name: 'Sposta titolo', exact: true }).count(), 0, 'Scegliere la prossima modalità non modifica la grafica corrente');
  await page.getByLabel('Descrizione per Instagram', { exact: true }).fill('Descrizione corretta prima del salvataggio.\n\n#prova');
  const integratedPreview = await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  let destinationAccounts = [{ id: 'test-account', name: 'Account dimostrativo' }];
  const published = [];
  await context.route('**/api/social/posts/*/prepare', route => route.fulfill({ json: { accounts: destinationAccounts, platform: 'instagram' } }));
  await context.route('**/api/social/publish', async route => {
    const body = route.request().postDataJSON(); published.push(body);
    const row = await app.db.prepare('SELECT data FROM posts WHERE id=? AND user_id=?').get(body.post_id, user.id);
    await app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(row.data), status: 'in_coda' }), body.post_id);
    await route.fulfill({ json: { ok: true } });
  });
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click();
  await page.getByRole('heading', { name: 'Pubblica su Instagram' }).waitFor();
  assert.equal(await selectedValue(page, page.getByLabel('Account di destinazione')), 'test-account');
  assert.equal(await page.getByLabel('Testo e hashtag').inputValue(), 'Descrizione corretta prima del salvataggio.\n\n#prova');
  assert.equal(published.length, 0, 'Nessun invio prima della conferma');
  const simpleId = new URL(page.url()).searchParams.get('id');
  const integratedPost = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(simpleId)).data);
  assert.equal(integratedPost.status, 'bozza'); assert.equal(integratedPost.mode, 'graphic');
  assert.equal(integratedPost.context, 'Racconta i sapori del borgo');
  assert.equal(integratedPost.design.text_mode, 'image');
  assert.deepEqual(readFileSync(join(app.config.dataDir, 'uploads', integratedPost.image_url.split('/').pop())), Buffer.from(integratedPreview, 'base64'));
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click();
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  assert.equal(await page.getByRole('button', { name: 'Bozze', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.locator('a[href="/studio?id=' + simpleId + '"]').first().waitFor();
  const card = page.getByRole('article').filter({ has: page.locator('a[href="/studio?id=' + simpleId + '"]') });
  const thumb = card.locator('.library-post-cover img');
  const latestDraft = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(simpleId)).data);
  await thumb.evaluate(img => img.decode());
  assert.equal(await thumb.getAttribute('src'), latestDraft.image_url);
  assert.ok((await thumb.boundingBox()).width >= 135);
  assert.equal(await card.locator('.library-post-status').innerText(), 'Bozza');
  await page.waitForFunction(() => !document.querySelector('[data-sonner-toast][data-visible="true"]'));
  await page.screenshot({ path: join(directory, 'library-mobile.png') });
  await page.getByRole('button', { name: 'Passa al tema scuro' }).tap();
  await page.getByRole('button', { name: 'Passa al tema chiaro' }).waitFor();
  await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
  await page.locator('[data-tour="library-filters"]').evaluate(element => Promise.all(element.getAnimations({ subtree: true }).map(animation => animation.finished)));
  await page.screenshot({ path: join(directory, 'library-mobile-dark.png') });
  await page.getByRole('button', { name: 'Passa al tema chiaro' }).tap();
  assert.equal(await page.locator('a[href="/studio?id=' + lockedId + '"]').count(), 0, 'Bozze esclude i pubblicati');
  const count = (await app.db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id=?').get(user.id)).count;
  await page.goto(origin + '/studio?id=' + simpleId); await readyGraphic();
  assert.equal(await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]), integratedPreview, 'La riapertura conserva la grafica integrata e il logo');
  console.log('Grafica AI simulata: scritte senza duplicati, logo modificabile, cambio formato, esportazione e riapertura verificati.');
  assert.equal(await page.getByLabel('Descrizione per Instagram', { exact: true }).inputValue(), 'Descrizione corretta prima del salvataggio.\n\n#prova');
  destinationAccounts = [];
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click(); await page.getByRole('link', { name: 'Collega il social' }).waitFor();
  assert.equal(published.length, 0);
  await page.getByRole('button', { name: 'Chiudi', exact: true }).click(); destinationAccounts = [{ id: 'test-account', name: 'Account dimostrativo' }];
  await page.getByRole('button', { name: 'Pubblica', exact: true }).click();
  await page.getByRole('button', { name: 'Conferma pubblicazione', exact: true }).click(); await page.waitForURL('**/library');
  assert.equal(published.length, 1); assert.equal(published[0].confirmed, true); assert.equal(published[0].account_id, 'test-account');
  assert.equal(published[0].caption, 'Descrizione corretta prima del salvataggio.\n\n#prova');
  assert.equal((await app.db.prepare('SELECT COUNT(*) AS count FROM posts WHERE user_id=?').get(user.id)).count, count, 'Pubblica aggiorna la bozza senza duplicarla');
  assert.equal(await page.getByRole('button', { name: 'Tutti', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.getByRole('button', { name: 'Calendario', exact: true }).click();
  await selectValue(page, page.getByLabel('Organizza per'), 'agenda');
  await page.getByRole('button', { name: 'Pubblicati', exact: true }).click();
  await page.locator('a[href="/studio?id=' + lockedId + '"]').first().waitFor();
  await page.goto(origin + '/profilo'); await page.getByText('Informazioni azienda', { exact: true }).click(); await page.getByLabel('Nome dell’attività').waitFor();
  assert.equal(await page.getByLabel('Tono del testo').isVisible(), false);
  await page.getByText('Tono di voce', { exact: true }).click();
  await selectValue(page, page.getByLabel('Tono del testo'), 'ispirazionale'); await page.getByRole('button', { name: 'Salva dati azienda' }).click();
  await page.getByText('Dati azienda aggiornati', { exact: true }).waitFor();
  await page.goto(origin + '/studio?new=1'); await open('Testi e AI');
  assert.equal(await selectedValue(page, page.getByLabel('Tono del testo')), 'ispirazionale', 'Un nuovo post recupera le preferenze aggiornate');
  await close();
  await page.goto(origin + '/configura-azienda'); await page.getByLabel('Nome dell’attività', { exact: true }).waitFor();
  assert.equal(await page.getByLabel('Nome dell’attività', { exact: true }).inputValue(), 'Attività di collaudo');
  assert.equal(await page.getByRole('button', { name: 'Crea il primo post' }).isEnabled(), false);
  await selectValue(page, page.getByLabel('Di cosa ti occupi?'), 'Viaggi');
  await page.screenshot({ path: join(directory, 'setup-mobile.png') });
  await page.getByRole('button', { name: 'Crea il primo post' }).click(); await page.waitForURL('**/studio');
  assert.equal(JSON.parse((await app.db.prepare('SELECT profile FROM users WHERE id=?').get(user.id)).profile).tone_of_voice, 'ispirazionale');
  await app.db.prepare("UPDATE users SET role='admin' WHERE id=?").run(user.id);
  await page.setViewportSize({ width: 320, height: 568 }); await page.goto(origin + '/studio');
  await mainNav.getByRole('link', { name: 'Profilo', exact: true }).click();
  const management = page.getByRole('button', { name: 'Gestione', exact: true });
  await management.waitFor();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Navigazione amministratore senza scorrimento orizzontale');
  assert.deepEqual(await mainNav.getByRole('link').allTextContents(), ['Home', 'Calendario', 'Crea', 'Statistiche', 'Profilo']);
  for (const section of ['Home', 'Calendario', 'Crea', 'Statistiche', 'Profilo']) {
    const item = section === 'Gestione' ? management : mainNav.getByRole('link', { name: section, exact: true });
    const box = await item.boundingBox();
    assert.ok(box && box.height >= 44 && box.x >= 0 && box.x + box.width <= 320, 'Voce visibile e toccabile: ' + section);
  }
  for (const [name, path] of [['Area azienda', '/admin'], ['Sviluppatore', '/sviluppatore']]) {
    await page.goto(origin + '/profilo'); await management.tap();
    const menu = page.getByRole('dialog', { name: 'Gestione', exact: true });
    if (path === '/admin') await page.screenshot({ path: join(directory, 'management-mobile.png') });
    await menu.getByRole('link', { name: new RegExp(name) }).tap(); await page.waitForURL('**' + path);
    await page.getByRole('heading', { name, exact: true }).waitFor();
    assert.ok(await page.getByRole('heading', { name, exact: true }).isVisible());
  }
  console.log('Percorso semplice senza impostazioni, bozze, conferma social simulata, profilo e configurazione iniziale verificati.');
  compositionScene = { reliable: true, protected_regions: [{ x: 0, y: .66, width: 1, height: .34 }, { x: .05, y: .26, width: .48, height: .38 }, { x: .55, y: 0, width: .45, height: .25 }], quiet_regions: [{ x: .055, y: .055, width: .44, height: .18 }, { x: .60, y: .30, width: .35, height: .30 }] };
  compositionScene.layout = { heading: { x: .07, y: .065, width: .42, height: .16 }, subtitle: { x: .60, y: .31, width: .32, height: .10 }, logo: { x: .75, y: .46, width: .17, height: .12 } };
  fixtureCopy = { headline: 'Sapori del borgo', graphic_subtitle: 'Storie da vivere', caption: 'Descrizione completa da conservare.', hashtags: '#borgo' };
  aiTextStyle.heading.emphasis = { ...aiTextStyle.heading.emphasis, text: 'borgo', separate_line: false };
  fixtureImage = await page.evaluate(scene => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#E1DACB'; ctx.fillRect(0, 0, 1080, 1080);
    for (const box of scene.protected_regions) { ctx.fillStyle = '#7A8879'; ctx.fillRect(box.x * 1080, box.y * 1080, box.width * 1080, box.height * 1080); }
    return canvas.toDataURL('image/png').split(',')[1];
  }, compositionScene);
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(origin + '/studio?new=1');
  const communication = page.getByRole('textbox', { name: 'Cosa vuoi comunicare? (facoltativo)', exact: true });
  assert.equal(await communication.count(), 0, 'Il campo compare soltanto dopo aver caricato la foto');
  for (const viewport of [{ width: 390, height: 844 }, { width: 320, height: 568 }]) {
    await page.setViewportSize(viewport); await settle();
    for (const locator of [page.getByRole('button', { name: 'Scegli foto', exact: true }), page.getByRole('button', { name: 'Scatta foto', exact: true })]) {
      const box = await locator.boundingBox();
      assert.ok(box && box.y >= 0 && box.y + box.height <= viewport.height, 'Scelta e scatto accessibili prima del caricamento');
    }
    await page.screenshot({ path: join(directory, 'message-empty-' + viewport.width + '.png') });
  }
  await page.setViewportSize({ width: 1280, height: 900 }); await settle();
  await page.locator('[data-tour="studio-uploader"] input[type="file"]').setInputFiles({ name: 'spazi-separati.png', mimeType: 'image/png', buffer: Buffer.from(fixtureImage, 'base64') });
  await page.locator('.studio-editor[aria-busy="false"]').waitFor();
  await page.getByRole('button', { name:'Anteprima iPhone' }).click();
  const phoneElement = await page.locator('iframe[data-clicksocial-preview="iphone"]').elementHandle();
  const studioPhone = await phoneElement.contentFrame();
  await studioPhone.locator('.studio-editor[aria-busy="false"]').waitFor();
  await studioPhone.waitForFunction(() => {
    const card = document.querySelector('.studio-preview-panel'), photo = document.querySelector('.studio-preview-frame');
    return innerWidth === 393 && Math.abs(card.clientWidth - photo.getBoundingClientRect().width) < 2;
  });
  const phoneBrief = studioPhone.locator('#post-context');
  await phoneBrief.fill('Prova di rotazione');
  const inputNode = await phoneBrief.elementHandle();
  await page.getByRole('button', { name:'Ruota iPhone in orizzontale' }).click();
  await studioPhone.waitForFunction(() => innerWidth === 852 && innerHeight === 393);
  await studioPhone.waitForFunction(() => {
    const preview = document.querySelector('.studio-preview-panel').getBoundingClientRect();
    const photo = document.querySelector('.studio-preview-frame').getBoundingClientRect();
    const controls = document.querySelector('.studio-result').getBoundingClientRect();
    const customize = document.querySelector('[data-tour="studio-settings"]').getBoundingClientRect();
    return preview.width > controls.width * 1.7 && photo.width > controls.width
      && photo.top < controls.top && customize.top >= photo.bottom - 1;
  });
  assert.ok(await inputNode.evaluate(node => node.isConnected));
  assert.equal(await phoneBrief.inputValue(), 'Prova di rotazione');
  await page.getByRole('button', { name:'Ruota iPhone in verticale' }).click();
  await studioPhone.waitForFunction(() => innerWidth === 393 && innerHeight === 852);
  await page.getByRole('button', { name:'Chiudi', exact:true }).click();
  await page.getByRole('dialog').waitFor({ state:'hidden' });
  assert.equal(await communication.inputValue(), 'Prova di rotazione');
  await communication.fill('Oggi caffè a 1 euro');
  assert.equal(await communication.getAttribute('maxlength'), '2000');
  assert.equal(await page.getByRole('dialog').count(), 0, 'Il messaggio si inserisce senza aprire le impostazioni');
  await page.screenshot({ path: join(directory, 'message-after-photo.png') });
  await communication.fill('Oggi raccontiamo i sapori del borgo');
  await open('Testi e AI'); await page.getByRole('button', { name: /^Foto creativa/ }).click(); await close();
  await page.evaluate(() => {
    window.compactTextDraws = []; window.originalTextDraw = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function(text, ...args) { window.compactTextDraws.push({ text, font: this.font }); return window.originalTextDraw.call(this, text, ...args); };
  });
  const previousCalls = aiCalls.length, compact = await generate();
  assert.equal(compact.status, 200); assert.equal(compact.body.composition_adjusted, true);
  for (const role of ['heading', 'subtitle', 'logo']) for (const key of ['x', 'y', 'width', 'height']) assert.equal(compact.body.design.elements[role][key], compositionScene.layout[role][key], 'Lo Studio applica la posizione proposta dall’AI: ' + role + ' ' + key);
  assert.equal(compact.request.context, 'Oggi raccontiamo i sapori del borgo');
  assert.equal(await page.getByRole('alert').count(), 0);
  assert.deepEqual(aiCalls.slice(previousCalls), ['copy', 'image', 'composition'], 'La composizione compatta usa solo le tre risposte simulate previste');
  assert.equal(await page.getByLabel('Descrizione per Instagram').inputValue(), 'Descrizione completa da conservare.\n\n#borgo');
  const drawn = await page.evaluate(() => { CanvasRenderingContext2D.prototype.fillText = window.originalTextDraw; return window.compactTextDraws; });
  for (const [word, minimum] of [['Sapori', 45], ['borgo', 45], ['Storie', 30]]) {
    const runs = drawn.filter(run => run.text.includes(word));
    assert.ok(runs.length, 'La scritta viene realmente disegnata: ' + word);
    assert.ok(runs.every(run => Number(run.font.match(/([\d.]+)px/)[1]) >= minimum), 'Dimensioni leggibili per ' + word);
  }
  await page.screenshot({ path: join(directory, 'compact-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 }); await settle();
  const toastBox = await page.locator('[data-sonner-toast][data-visible="true"]').last().boundingBox();
  if (toastBox) assert.ok(toastBox.x >= 0 && toastBox.x + toastBox.width <= 391, 'Avviso leggibile anche su smartphone');
  await page.screenshot({ path: join(directory, 'compact-mobile.png') });
  const compactPreview = await page.locator('.studio-preview-frame canvas').evaluate(canvas => canvas.toDataURL('image/png').split(',')[1]);
  await page.getByRole('button', { name: 'Salva in bozze', exact: true }).click(); await page.waitForURL('**/library?view=drafts');
  const compactPost = (await app.db.prepare('SELECT data FROM posts WHERE user_id=?').all(user.id)).map(row => JSON.parse(row.data)).find(post => post.headline === 'Sapori del borgo');
  assert.ok(compactPost); assert.equal(compactPost.graphic_subtitle, 'Storie da vivere');
  assert.equal(compactPost.context, 'Oggi raccontiamo i sapori del borgo', 'Le indicazioni restano nella bozza');
  assert.deepEqual(readFileSync(join(app.config.dataDir, 'uploads', compactPost.image_url.split('/').pop())), Buffer.from(compactPreview, 'base64'));
  const compactId = (await app.db.prepare('SELECT id,data FROM posts WHERE user_id=?').all(user.id)).find(row => JSON.parse(row.data).headline === 'Sapori del borgo').id;
  await page.goto(origin + '/studio?id=' + compactId); await ready();
  await page.locator('.studio-revision summary').click();
  assert.equal(await communication.inputValue(), compactPost.context, 'La riapertura recupera il messaggio');
  const planningId = randomUUID();
  const planned = { title: 'Preparazione della sagra', status: 'bozza', original_image_url: photo.file_url, design,
    planning: { topic: 'Sagra', stage: 'materiale_disponibile', provisional_copy: 'Appunti da completare' } };
  await app.db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(planningId, user.id, JSON.stringify(planned), now(), now());
  await page.goto(origin + '/studio?id=' + planningId);
  await page.getByRole('button', { name: 'Genera', exact: true }).waitFor();
  assert.ok(await communication.isVisible());
  assert.equal(await page.getByRole('button', { name: 'Pubblica', exact: true }).count(), 0, 'Il testo provvisorio del calendario non presenta la foto come un post generato');
  console.log('Spazi separati: generazione simulata, font reali leggibili, desktop, smartphone ed esportazione verificati.');
  await page.goto(origin + '/home');
  await page.locator('.home-shortcut[href="/impostazioni"]').click();
  const brandColors = page.locator('.brand-preference summary').filter({ hasText:'Colori del brand' });
  await brandColors.waitFor();
  assert.equal(await page.locator('[data-tour="brand-save"]').count(), 0);
  await brandColors.click();
  await page.getByLabel('Carica un font per i testi').setInputFiles(resolve('public/fonts/DM-Sans.ttf'));
  await page.getByText('Carattere caricato', { exact:true }).waitFor();
  assert.equal(await selectedValue(page, page.getByLabel('Font dei testi', { exact:true })), 'custom');
  await page.locator('[data-tour="brand-save"]').click();
  await page.locator('[data-tour="brand-save"]').waitFor({ state:'detached' });
  const savedBrand = JSON.parse((await app.db.prepare('SELECT profile FROM users WHERE id=?').get(user.id)).profile).brand_settings;
  assert.match(savedBrand.fonts.body.url, /^\/api\/files\/[a-f0-9-]{36}$/);
  assert.equal(savedBrand.fonts.body.family, 'DM-Sans');
  await page.reload(); await brandColors.click();
  assert.equal(await selectedValue(page, page.getByLabel('Font dei testi', { exact:true })), 'custom');
  await page.setViewportSize({ width:1280, height:900 });
  const primaryColor = page.getByLabel('Primario', { exact:true });
  await primaryColor.fill('#145A7E'); await primaryColor.press('Tab');
  await page.getByRole('button', { name:'Anteprima iPhone' }).click();
  const brandPhone = page.frameLocator('iframe[data-clicksocial-preview="iphone"]');
  await brandPhone.locator('summary').filter({ hasText:'Tono di voce' }).click();
  await selectValue(brandPhone, brandPhone.getByLabel('Tono del testo'), 'elegante');
  await brandPhone.locator('summary').filter({ hasText:'Colori del brand' }).click();
  const secondaryColor = brandPhone.getByLabel('Secondario', { exact:true });
  await secondaryColor.fill('#D7AD90'); await secondaryColor.press('Tab');
  await brandPhone.locator('[data-tour="brand-save"]').click();
  await brandPhone.locator('[data-tour="brand-save"]').waitFor({ state:'detached' });
  await page.getByRole('button', { name:'Chiudi', exact:true }).click();
  await page.locator('.brand-summary-value').filter({ hasText:'Elegante' }).waitFor();
  assert.equal(await primaryColor.inputValue(), '#145A7E');
  assert.equal(await page.getByLabel('Secondario', { exact:true }).inputValue(), '#D7AD90');
  await page.locator('[data-tour="brand-save"]').click();
  await page.locator('[data-tour="brand-save"]').waitFor({ state:'detached' });
  const merged = JSON.parse((await app.db.prepare('SELECT profile FROM users WHERE id=?').get(user.id)).profile);
  assert.equal(merged.company_name, 'Attività di collaudo');
  assert.equal(merged.tone_of_voice, 'elegante');
  assert.deepEqual(merged.brand_settings.colors.slice(0,2), ['#145A7E','#D7AD90']);
  assert.deepEqual(merged.brand_settings.fonts.body, savedBrand.fonts.body);
  console.log('Impostazioni brand: il font caricato resta selezionato, salvato e disponibile alla riapertura.');
  assert.equal(errors.length, 0, errors.join('\n')); assert.equal(external.length, 0, external.join('\n'));
  writeFileSync(join(directory, 'report.json'), JSON.stringify({ passed: true, viewports, errors, external, aiCalls, screenshots: ['studio-desktop.png', 'studio-mobile.png', 'studio-mobile-drawer.png', 'composition-mobile.png', 'composition-desktop.png'] }, null, 2));
  console.log('Contenuti bloccati e conversione esplicita dei vecchi post verificati. Report: ' + directory);
} catch (error) {
  if (page) await page.screenshot({ path: join(directory, 'failure.png') }).catch(() => {});
  console.error('Artefatti del collaudo: ' + directory);
  throw error;
} finally {
  if (browser) await browser.close();
  if (app) await app.close();
}

async function selectValue(page, control, value) {
  await control.click();
  await page.locator('[role="option"][data-option-value=' + JSON.stringify(String(value)) + ']').click();
}

async function selectedValue(page, control) {
  await control.click();
  const value = await page.locator('[role="option"][data-state="checked"]').getAttribute('data-option-value');
  await page.keyboard.press('Escape');
  return value;
}
async function selectOptions(page, control) {
  await control.click();
  const values = await page.locator('[role="option"]').evaluateAll(options => options.map(option => option.dataset.optionValue));
  await page.keyboard.press('Escape');
  return values;
}
