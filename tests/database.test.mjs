import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { openStore, uid, now, transaction } from '../server/store.mjs';
import { testDatabase } from './helpers/database.mjs';

test('database: rollback completo e query esterne escluse dalla transazione', async t => {
  const config=loadConfig({...await testDatabase(),dataDir:resolve('work/tests',randomUUID())});
  const db=await openStore(config); t.after(()=>db.close());
  const first=uid(),outside=uid();
  await db.prepare('INSERT INTO users(id,email,created_at) VALUES (?,?,?)').run(first,'first@example.test',now());
  let entered, release;
  const started=new Promise(resolve=>{entered=resolve;});
  const gate=new Promise(resolve=>{release=resolve;});
  const write=transaction(db,async()=>{
    await db.prepare("UPDATE users SET plan='pro' WHERE id=?").run(first);
    entered(); await gate;
    throw new Error('Errore previsto durante la transazione');
  });
  const rejected=assert.rejects(write,/Errore previsto/);
  await started;
  const independent=db.prepare('INSERT INTO users(id,email,created_at) VALUES (?,?,?)').run(outside,'outside@example.test',now());
  release(); await rejected; await independent;
  assert.equal((await db.prepare('SELECT plan FROM users WHERE id=?').get(first)).plan,'free');
  assert.equal((await db.prepare('SELECT id FROM users WHERE id=?').get(outside)).id,outside);
});

test('database: JSON, Unicode e confronto dei dati senza perdere maiuscole e minuscole', async t => {
  const config=loadConfig({...await testDatabase(),dataDir:resolve('work/tests',randomUUID())});
  const db=await openStore(config); t.after(()=>db.close());
  const user=uid(),post=uid();
  await db.prepare('INSERT INTO users(id,email,created_at) VALUES (?,?,?)').run(user,'unicode@example.test',now());
  const data=JSON.stringify({status:'in_coda',caption:'Caffè e artigianato 日本語',scheduled_at:'2026-09-10T12:00:00.000Z'});
  await db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(post,user,data,now(),now());
  const due=await db.prepare(`SELECT * FROM posts WHERE ${db.json('status')}='in_coda' AND ${db.json('scheduled_at')}<=?`).all('2026-09-11T12:00:00.000Z');
  assert.equal(due.length,1); assert.equal(due[0].data,data);
  assert.equal((await db.prepare('UPDATE posts SET data=? WHERE id=? AND data=?').run('{}',post,data.replace('Caffè','caffè'))).changes,0);
  assert.equal((await db.prepare('SELECT data FROM posts WHERE id=?').get(post)).data,data);
});

test('database: una query avviata dopo la chiusura della sua transazione viene rifiutata', async t => {
  const config=loadConfig({...await testDatabase(),dataDir:resolve('work/tests',randomUUID())});
  const db=await openStore(config); t.after(()=>db.close());
  let release,late;
  const gate=new Promise(resolve=>{release=resolve;});
  await transaction(db,async()=>{ late=gate.then(()=>db.prepare('SELECT 1').get()); });
  const rejected=assert.rejects(late,/già terminata/); release(); await rejected;
});
