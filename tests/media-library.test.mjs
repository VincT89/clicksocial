import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createApp } from '../server/app.mjs';
import { digest, now } from '../server/store.mjs';
import { sqliteSnapshot } from '../server/mysql-migration.mjs';
import { SQLITE_SCHEMA, SCHEMA_VERSION } from '../server/schema.mjs';
import { MAX_IMAGE_BYTES } from '../shared/media.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');

test('Libreria privata, caricamenti indipendenti dai post e aggiornamento da v1', async t => {
  const root = resolve(tmpdir());
  const dataDir = mkdtempSync(join(root, 'clicksocial-media-'));
  const options = { useProjectEnv:false, dbDriver:'sqlite', dataDir, port:0, origin:'http://localhost:5173', localMode:true, scheduler:false,
    smtpHost:'', openaiKey:'', stripeKey:'', metaId:'', fetchImpl:async () => { throw new Error('Il collaudo deve restare locale.'); } };
  let app, base;
  t.after(async () => {
    try { if (app) await app.close(); }
    finally { if (dirname(dataDir) === root && dataDir.startsWith(join(root, 'clicksocial-media-'))) rmSync(dataDir, { recursive:true, force:true }); }
  });
  const start = async () => {
    app = await createApp(options);
    await new Promise((resolve, reject) => { app.server.once('error', reject); app.server.listen(0, '127.0.0.1', resolve); });
    base = 'http://127.0.0.1:' + app.server.address().port;
  };
  const v1 = new DatabaseSync(join(dataDir, 'clicksocial.sqlite'));
  v1.exec(SQLITE_SCHEMA);
  v1.exec('DROP TABLE media_uploads; PRAGMA user_version=1');
  v1.close();
  assert.deepEqual(sqliteSnapshot({ dataDir }).rows.media_uploads, []);
  await start();
  const db = app.db;
  assert.equal((await db.prepare('PRAGMA user_version').get()).user_version, SCHEMA_VERSION);

  const account = async (name, role = 'user') => {
    const id = randomUUID(), token = randomBytes(32).toString('hex');
    await db.prepare('INSERT INTO users(id,email,role,verified,created_at) VALUES (?,?,?,1,?)').run(id, name + '@example.test', role, now());
    await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config, token), id, Date.now() + 3600000);
    return { id, cookie:'clicksocial_session=' + token };
  };
  const alice = await account('alice'), bob = await account('bob'), admin = await account('admin', 'admin');
  const get = (path, who) => fetch(base + path, { headers:who ? { Cookie:who.cookie } : {} });
  const list = async (query = '', who = alice) => {
    const response = await get('/api/media' + query, who);
    assert.equal(response.status, 200); assert.match(response.headers.get('cache-control'), /no-store/);
    return response.json();
  };
  const upload = (who, name, body = png, path = '/api/media', headers = {}) => fetch(base + path, {
    method:'POST', headers:{ ...(who && { Cookie:who.cookie }), 'Content-Type':'image/png', 'X-File-Name':encodeURIComponent(name), ...headers }, body,
  });
  const put = async (who, name, path) => {
    const res = await upload(who, name, png, path);
    assert.equal(res.status, 200); return (await res.json()).file_url;
  };
  const addPost = async (who, data) => db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(randomUUID(), who.id, JSON.stringify(data), now(), now());

  assert.equal((await get('/api/media')).status, 401);
  assert.equal((await upload(null, 'anon.png')).status, 401);
  assert.equal((await upload(alice, 'esterno.png', png, '/api/media', { Origin:'https://altro.example.test' })).status, 403);
  assert.equal((await upload(alice, 'testo.png', Buffer.from('<svg/>'))).status, 400);
  assert.equal((await upload(alice, 'troncato.png', png.subarray(0, 8))).status, 400);
  assert.equal((await upload(alice, 'vuoto.png', Buffer.alloc(0))).status, 400);
  assert.equal((await upload(alice, 'grande.png', Buffer.alloc(MAX_IMAGE_BYTES + 1))).status, 413);
  assert.equal((await get('/api/media?kind=video', alice)).status, 400);
  assert.equal((await get('/api/media?cursor=invalid', alice)).status, 400);
  assert.deepEqual(await list(), { items:[], total:0, nextCursor:null });

  const first = await put(alice, 'Una città & il mare.png');
  const original = await put(alice, 'originale.png', '/api/files');
  const graphic = await put(alice, 'grafica.png', '/api/files');
  const internal = await put(alice, 'logo.png', '/api/files');
  const other = await put(bob, 'bob.png');
  assert.equal((await db.prepare('SELECT count(*) AS n FROM posts').get()).n, 0);
  assert.equal((await list()).items[0].name, 'Una città & il mare.png');
  const secondToken = randomBytes(32).toString('hex');
  await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config, secondToken), alice.id, Date.now() + 3600000);
  const secondSession = await fetch(base + '/api/media', { headers:{ Origin:'capacitor://localhost', 'X-ClickSocial-Client':'native', Authorization:'Bearer ' + secondToken } });
  assert.equal(secondSession.status, 200);
  assert.equal((await secondSession.json()).items[0].file_url, first);
  assert.equal((await get(first, bob)).status, 404);
  assert.equal((await get(first)).status, 401);
  const image = await get(first, alice);
  assert.equal(image.headers.get('content-type'), 'image/png');
  assert.equal(image.headers.get('x-content-type-options'), 'nosniff');
  assert.deepEqual(Buffer.from(await image.arrayBuffer()), png);
  await addPost(alice, { original_image_url:options.origin + original, image_url:graphic });
  await addPost(alice, { original_image_url:original, image_url:'', graphic_url:graphic });
  await addPost(alice, { original_image_url:first, image_url:first });
  await addPost(alice, { image_url:'https://esterno.example.test' + internal, original_image_url:other });
  assert.deepEqual(new Set((await list('?kind=photo')).items.map(x => x.file_url)), new Set([first, original]));
  assert.deepEqual((await list('?kind=graphic')).items.map(x => x.file_url), [graphic]);
  assert.equal((await list()).total, 3);
  assert.equal((await list('?user_id=' + alice.id, admin)).total, 0);
  assert.deepEqual((await list('?user_id=' + alice.id, bob)).items.map(x => x.file_url), [other]);

  const uploads = join(dataDir, 'uploads'), before = readdirSync(uploads);
  await db.prepare("CREATE TRIGGER test_failure BEFORE INSERT ON media_uploads BEGIN SELECT RAISE(ABORT,'errore di collaudo'); END").run();
  const { saveImage } = await import('../server/files.mjs');
  await assert.rejects(saveImage(db, app.config, alice, png, 'interrotto.png', { media:true }), /errore di collaudo/);
  await db.prepare('DROP TRIGGER test_failure').run();
  assert.deepEqual(readdirSync(uploads), before);
  assert.equal((await db.prepare('SELECT count(*) AS n FROM files WHERE name=?').get('interrotto.png')).n, 0);
  await Promise.all(Array.from({ length:24 }, (_, i) => put(alice, 'prova-' + i + '.png')));
  await db.prepare('UPDATE files SET created_at=? WHERE user_id=?').run('2026-01-01T00:00:00.000Z', alice.id);
  const page = await list(), next = await list('?cursor=' + encodeURIComponent(page.nextCursor));
  assert.equal(page.total, 27); assert.equal(page.items.length, 24); assert.equal(next.items.length, 3);
  assert.equal(next.nextCursor, null); assert.equal(new Set([...page.items, ...next.items].map(x => x.id)).size, 27);
  assert.equal(sqliteSnapshot({ dataDir }).counts.media_uploads, 26);
  await app.close(); app = null; await start();
  assert.equal((await list()).total, 27);
  assert.equal((await get(first, alice)).status, 200);
});
