import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { testDatabase } from './helpers/database.mjs';
import { mobileOrigin, isPrivateAddress, privateFilePath } from '../shared/mobile-config.mjs';
import { mobileRequestPolicy } from '../server/mobile-access.mjs';
import { restoreStudioDraft, draftStorageKey } from '../src/lib/studioDraft.mjs';

test('indirizzi di collaudo espliciti, senza credenziali o server HTTP pubblici', () => {
  assert.equal(mobileOrigin('http://192.168.1.6:5181', true), 'http://192.168.1.6:5181');
  assert.equal(mobileOrigin('https://api.example.test'), 'https://api.example.test');
  for (const address of ['http://192.168.1.6:5181', 'http://example.test', 'https://name:secret@example.test', 'https://example.test/api', 'https://example.test/?token=x']) assert.throws(() => mobileOrigin(address));
  assert.throws(() => mobileOrigin('http://example.test', true));
  assert.equal(isPrivateAddress('::ffff:192.168.1.6'), true);
  assert.equal(isPrivateAddress('172.32.0.1'), false);
  assert.equal(isPrivateAddress('192.168.1.999'), false);
  assert.equal(privateFilePath('https://other.test/api/files/11111111-1111-1111-1111-111111111111', 'https://api.example.test'), null);
});

test('bozze isolate per utente e server, filtri conservati anche agli estremi', () => {
  const file = '/api/files/11111111-1111-1111-1111-111111111111';
  const defaults = { brightness: 100, contrast: 100, saturate: 100, warmth: 0, blur: 0, vignette: 0 };
  const input = { version: 1, originalUrl: file, title: 'La mia bozza', context: 'Dettagli reali', filters: { contrast: 160, warmth: -60, blur: 8, vignette: 80 }, copy: { caption: 'Testo conservato', graphic_url: file } };
  const saved = restoreStudioDraft(JSON.stringify(input), defaults);
  assert.equal(saved.filters.contrast, 160); assert.equal(saved.filters.warmth, -60); assert.equal(saved.filters.vignette, 80);
  assert.equal(saved.copy.caption, input.copy.caption);
  assert.equal(restoreStudioDraft(JSON.stringify({ ...input, originalUrl: 'https://other.test/photo.png' }), defaults), null);
  assert.equal(restoreStudioDraft('{', defaults), null);
  assert.notEqual(draftStorageKey('https://one.test', 'a'), draftStorageKey('https://one.test', 'b'));
  assert.notEqual(draftStorageKey('https://one.test', 'a'), draftStorageKey('https://two.test', 'a'));
});

test('la posta locale non è esposta ai telefoni e il collaudo rifiuta indirizzi pubblici', () => {
  const res = { setHeader() {} };
  const config = { lanMode: true, origin: 'http://192.168.1.6:5181' };
  assert.throws(() => mobileRequestPolicy({ headers: {}, method: 'GET', socket: { remoteAddress: '192.168.1.10' } }, res, config, '/dev/mail'), error => error.status === 403);
  assert.throws(() => mobileRequestPolicy({ headers: {}, method: 'GET', socket: { remoteAddress: '8.8.8.8' } }, res, config, '/api/health'), error => error.status === 403);
});

test('sessioni native: accesso, file privati, CORS, logout e revoca dopo recupero password', async t => {
  const dir = resolve('work/tests'); mkdirSync(dir, { recursive: true });
  const database = await testDatabase();
  const app = await createApp({ ...database, dataDir: mkdtempSync(join(dir, 'mobile-')), host: '127.0.0.1', port: 0, origin: 'http://localhost:5181', localMode: true, scheduler: false,
    smtpHost: '', openaiKey: '', textModel: '', imageModel: '', stripeKey: '', googleId: '', metaId: '', fetchImpl: async () => { throw new Error('Rete esterna inattesa nel collaudo.'); } });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  t.after(() => app.close());
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const email = 'mobile@example.test', password = 'Mobile-test-password-2026';
  const headers = { 'Content-Type': 'application/json', 'X-ClickSocial-Client': 'native', Origin: 'capacitor://localhost' };
  const post = (path, data, extra = {}) => fetch(base + path, { method: 'POST', headers: { ...headers, ...extra }, body: JSON.stringify(data) });
  assert.equal((await post('/api/auth/register', { email, password })).status, 200);
  const mail = await app.db.prepare('SELECT body FROM mail WHERE recipient=? ORDER BY created_at DESC').get(email);
  const verified = await post('/api/auth/verify', { email, otpCode: mail.body.match(/\b\d{6}\b/)[0] });
  assert.equal(verified.headers.get('set-cookie'), null);
  const account = await verified.json(); assert.match(account.session_token, /^[a-f0-9]{64}$/);
  const authenticated = { ...headers, Authorization: 'Bearer ' + account.session_token };
  const me = await fetch(base + '/api/auth/me', { headers: authenticated });
  assert.equal(me.status, 200); assert.equal((await me.json()).session_token, undefined);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aF4sAAAAASUVORK5CYII=', 'base64');
  const uploaded = await fetch(base + '/api/files', { method: 'POST', headers: { ...authenticated, 'Content-Type': 'image/png', 'X-File-Name': 'prova.png' }, body: png });
  assert.equal(uploaded.status, 200);
  const { file_url } = await uploaded.json();
  const image = await fetch(base + file_url, { headers: authenticated });
  assert.equal(image.status, 200); assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  assert.equal((await fetch(base + file_url)).status, 401);
  const login = await post('/api/auth/login', { email, password });
  const secondToken = (await login.json()).session_token;
  const preflight = await fetch(base + '/api/files', { method: 'OPTIONS', headers: { Origin: 'https://localhost', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'authorization,content-type,x-file-name,x-clicksocial-client' } });
  assert.equal(preflight.status, 204); assert.equal(preflight.headers.get('access-control-allow-origin'), 'https://localhost');
  assert.equal((await post('/api/auth/login', { email, password }, { Origin: 'https://unrelated.example' })).status, 403);
  assert.equal((await post('/api/auth/logout', {}, { Authorization: 'Bearer ' + account.session_token })).status, 200);
  assert.equal((await fetch(base + '/api/auth/me', { headers: authenticated })).status, 401);
  assert.equal((await fetch(base + '/api/auth/me', { headers: { ...headers, Authorization: 'Bearer ' + secondToken } })).status, 200);
  await post('/api/auth/reset-request', { email });
  const resetMail = await app.db.prepare("SELECT body FROM mail WHERE recipient=? AND subject LIKE 'Reimposta%' ORDER BY created_at DESC").get(email);
  const reset = new URL(resetMail.body.split('\n')[1]);
  assert.equal((await post('/api/auth/reset', { email, resetToken: reset.searchParams.get('token'), newPassword: 'Mobile-new-password-2026' })).status, 200);
  assert.equal((await fetch(base + '/api/auth/me', { headers: { ...headers, Authorization: 'Bearer ' + secondToken } })).status, 401);
  const webLogin = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Mobile-new-password-2026' }) });
  assert.match(webLogin.headers.get('set-cookie'), /HttpOnly; SameSite=Lax/);
  assert.equal((await webLogin.json()).session_token, undefined);
});
