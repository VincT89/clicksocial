import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { loadConfig } from '../server/config.mjs';
import { openStore, hashPassword } from '../server/store.mjs';
import { testDatabase, testDatabaseEnv } from './helpers/database.mjs';

test('amministratore locale Pro: creazione idempotente e password esistenti preservate', async () => {
  const dataDir=resolve('work','tests',randomUUID());
  const database = await testDatabase();
  const env={...process.env,...testDatabaseEnv(database),DATA_DIR:dataDir,LOCAL_MODE:'true',APP_ORIGIN:'http://127.0.0.1:5180',SMTP_HOST:''};
  const run=() => {
    const result=spawnSync(process.execPath,['scripts/provision-admin.mjs','admin@example.test'],{env,encoding:'utf8',windowsHide:true});
    assert.equal(result.status,0,result.stderr); return JSON.parse(result.stdout);
  };
  const first=run(); assert.equal(first.created,true); assert.equal(first.passwordSetupRequired,true);
  const db=(await openStore(loadConfig({dataDir,...database})));
  try {
    const row=(await db.prepare('SELECT * FROM users WHERE email=?').get('admin@example.test'));
    assert.equal(row.role,'admin'); assert.equal(row.plan,'pro'); assert.equal(row.verified,1); assert.equal(row.password,null);
    const mail=(await db.prepare('SELECT * FROM mail WHERE recipient=?').get(row.email));
    assert.match(mail.body,/reset-password\?token=[a-f0-9]{64}/);
    const existing=await hashPassword('Existing-test-password-2026');
    (await db.prepare('UPDATE users SET password=? WHERE id=?').run(existing,row.id));
    const second=run(); assert.equal(second.created,false); assert.equal(second.passwordSetupRequired,false);
    assert.equal((await db.prepare('SELECT password FROM users WHERE id=?').get(row.id)).password,existing);
    assert.equal((await db.prepare('SELECT COUNT(*) AS count FROM users').get()).count,1);
  } finally { (await db.close()); }
});

