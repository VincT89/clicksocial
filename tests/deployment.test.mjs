import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { createApp } from '../server/app.mjs';
import { createClientAddressResolver } from '../server/client-address.mjs';
import { loadConfig } from '../server/config.mjs';
import { openDatabase } from '../server/database.mjs';
import { grantAdmin } from '../server/admin-access.mjs';
import { hashPassword, now, uid } from '../server/store.mjs';
import { testDatabase, testDatabaseEnv } from './helpers/database.mjs';

const request = (address, headers = {}) => ({ socket: { remoteAddress: address }, headers });
const run = (args, env) => new Promise((resolve, reject) => {
  const child = spawn(process.execPath, args, { env: { ...process.env, ...env }, windowsHide: true });
  let stdout = '', stderr = '';
  child.stdout.on('data', data => { stdout += data; });
  child.stderr.on('data', data => { stderr += data; });
  child.on('error', reject);
  child.on('close', code => resolve({ code, stdout, stderr }));
});

test('proxy: header falsificati ignorati e indirizzi equivalenti normalizzati', () => {
  const direct = createClientAddressResolver();
  assert.equal(direct(request('::ffff:192.0.2.4', { 'x-forwarded-for': '198.51.100.7', '!~passenger-client-address': '198.51.100.8' })), '192.0.2.4');
  assert.equal(direct(request('2001:0db8:0000::1')), direct(request('2001:db8::1')));
  assert.equal(direct(request('::ffff:c000:204')), '192.0.2.4');
  assert.throws(() => createClientAddressResolver('passenger', null), /richiede l’avvio/);
  assert.throws(() => createClientAddressResolver('true'), /PROXY_MODE/);
  const passenger = createClientAddressResolver('passenger', { configure() {} });
  assert.equal(passenger(request(undefined, { '!~passenger-client-address': '192.0.2.4', 'x-forwarded-for': '198.51.100.9' })), '192.0.2.4');
  for (const value of [undefined, '192.0.2.4, 198.51.100.9', 'untrusted.example', 'fe80::1%eth0', ['192.0.2.4']]) {
    assert.throws(() => passenger(request('127.0.0.1', { '!~passenger-client-address': value })), error => error.status === 503);
  }
});

test('avvio pubblico: rifiuta la modalità locale prima di creare dati', async () => {
  const dataDir = resolve('work/tests', randomUUID());
  const result = await run(['app.cjs'], { DATA_DIR: dataDir, LOCAL_MODE: 'true', APP_ORIGIN: 'http://127.0.0.1:5180', DB_DRIVER: 'sqlite' });
  assert.equal(result.code, 1, result.stdout);
  assert.match(result.stderr, /LOCAL_MODE=false/);
  assert.equal(existsSync(dataDir), false);
});

test('configurazione: URL pubblico senza credenziali, percorsi o parametri', () => {
  const dataDir = resolve('work/tests', randomUUID());
  for (const origin of ['https://user:secret@example.test', 'https://example.test/api', 'https://example.test/?x=1', 'https://example.test/#x', 'http://example.test']) {
    assert.throws(() => loadConfig({ dataDir, localMode: false, origin }), /APP_ORIGIN/);
  }
  assert.equal(existsSync(dataDir), false);
  assert.throws(() => loadConfig({ dataDir: resolve('dist/private-data'), localMode: false, origin: 'https://app.example.test' }), /DATA_DIR/);
  assert.equal(loadConfig({ dataDir, localMode: false, origin: 'https://app.example.test/' }).origin, 'https://app.example.test');
});

test('limiti dietro Passenger: visitatori distinti, tentativi ripetuti e configurazione assente', async t => {
  const saved = globalThis.PhusionPassenger;
  globalThis.PhusionPassenger = { configure() {} };
  let app;
  try {
    app = await createApp({ ...await testDatabase(), dataDir: resolve('work/tests', randomUUID()), port: 0,
      localMode: false, origin: 'https://app.example.test', proxyMode: 'passenger', scheduler: false,
      smtpHost: '', openaiKey: '', googleId: '', metaId: '', fetchImpl: async () => { throw new Error('Chiamata esterna inattesa.'); } });
  } finally {
    if (saved === undefined) delete globalThis.PhusionPassenger; else globalThis.PhusionPassenger = saved;
  }
  t.after(() => app.close());
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + app.server.address().port;
  const login = async (ip, forwarded = '198.51.100.1') => {
    const response = await fetch(base + '/api/auth/login', { method: 'POST', headers: {
      'Content-Type': 'application/json', 'X-Forwarded-For': forwarded, ...(ip ? { '!~Passenger-Client-Address': ip } : {}),
    }, body: JSON.stringify({ email: 'unknown@example.test', password: 'incorrect' }) });
    await response.arrayBuffer();
    return response.status;
  };
  for (let i = 1; i <= 35; i++) assert.equal(await login('192.0.2.' + i), 401);
  for (let i = 1; i <= 30; i++) assert.equal(await login('198.51.100.10', '192.0.2.' + i), 401);
  assert.equal(await login('198.51.100.10', '192.0.2.200'), 429);
  assert.equal(await login(), 503);
  assert.equal((await fetch(base + '/dev/mail')).status, 404);
  assert.equal((await (await fetch(base + '/api/health')).json()).backend, 'node');
  const password = 'Deployment-test-password';
  const userId = uid();
  await app.db.prepare('INSERT INTO users(id,email,password,verified,created_at) VALUES (?,?,?,1,?)').run(userId, 'verified@example.test', await hashPassword(password), now());
  const signedIn = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', '!~Passenger-Client-Address': '203.0.113.10' }, body: JSON.stringify({ email: 'verified@example.test', password }) });
  assert.equal(signedIn.status, 200);
  assert.match(signedIn.headers.get('set-cookie'), /HttpOnly; SameSite=Lax;.*; Secure/);
  const cookie = signedIn.headers.get('set-cookie').split(';')[0];
  const invalidOrigin = await fetch(base + '/api/auth/logout', { method: 'POST', headers: { Cookie: cookie, Origin: 'https://unrelated.example', '!~Passenger-Client-Address': '203.0.113.10' } });
  assert.equal(invalidOrigin.status, 403);
  const secondId = uid();
  await app.db.prepare('INSERT INTO users(id,email,password,verified,created_at) VALUES (?,?,?,1,?)').run(secondId, 'second@example.test', await hashPassword(password), now());
  const secondLogin = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json', '!~Passenger-Client-Address': '203.0.113.10' }, body: JSON.stringify({ email: 'second@example.test', password }) });
  assert.equal(secondLogin.status, 200);
  const secondCookie = secondLogin.headers.get('set-cookie').split(';')[0];
  const invalidUpload = async sessionCookie => {
    const response = await fetch(base + '/api/files', { method: 'POST', headers: { Cookie: sessionCookie, 'Content-Type': 'image/png', '!~Passenger-Client-Address': '203.0.113.10' }, body: 'invalid image' });
    await response.arrayBuffer();
    return response.status;
  };
  for (let i = 0; i < 100; i++) assert.equal(await invalidUpload(cookie), 400);
  assert.equal(await invalidUpload(cookie), 429);
  assert.equal(await invalidUpload(secondCookie), 400, 'Il limite di un utente non deve bloccare un altro account sullo stesso IP.');
});

test('ruolo amministratore: verifica esplicita, account verificato e dati preservati', async () => {
  const dataDir = resolve('work/tests', randomUUID());
  const database = await testDatabase();
  const config = loadConfig({ ...database, dataDir, localMode: false, origin: 'https://app.example.test' });
  const db = await openDatabase(config);
  try {
    const id = uid(), password = await hashPassword('Preserved-test-password');
    await db.prepare('INSERT INTO users(id,email,password,verified,created_at) VALUES (?,?,?,0,?)').run(id, 'owner@example.test', password, now());
    await assert.rejects(grantAdmin(db, 'missing@example.test', true), /non trovato/);
    await assert.rejects(grantAdmin(db, 'owner@example.test', true), /verifica email/);
    await db.prepare('UPDATE users SET verified=1 WHERE id=?').run(id);
    assert.equal((await grantAdmin(db, 'owner@example.test')).applied, false);
    assert.equal((await db.prepare('SELECT role FROM users WHERE id=?').get(id)).role, 'user');
    assert.equal((await grantAdmin(db, 'owner@example.test', true)).role, 'admin');
    assert.equal((await grantAdmin(db, 'owner@example.test', true)).previousRole, 'admin');
    const row = await db.prepare('SELECT password,plan,verified FROM users WHERE id=?').get(id);
    assert.equal(row.password, password); assert.equal(row.plan, 'free'); assert.equal(row.verified, 1);
  } finally { await db.close(); }
});

test('attività pianificata: coda vuota su database isolato, senza server HTTP o chiamate esterne', async () => {
  const dataDir = resolve('work/tests', randomUUID());
  mkdirSync(dataDir, { recursive: true });
  const database = await testDatabase();
  const config = loadConfig({ ...database, dataDir, localMode: false, origin: 'https://app.example.test' });
  const db = await openDatabase(config);
  await db.close();
  const result = await run(['scripts/publish-due.mjs'], { ...testDatabaseEnv(database), DATA_DIR: dataDir,
    LOCAL_MODE: 'false', APP_ORIGIN: 'https://app.example.test', PROXY_MODE: 'passenger', SCHEDULER_ENABLED: 'false',
    OPENAI_API_KEY: '', META_APP_ID: '', META_APP_SECRET: '', INSTAGRAM_APP_ID: '', TIKTOK_CLIENT_KEY: '', SMTP_HOST: '' });
  assert.equal(result.code, 0, result.stderr);
  assert.match(result.stdout, /Controllo della coda completato/);
});
