import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { testDatabase } from './helpers/database.mjs';

test('accessi concorrenti: un solo primo amministratore, codici monouso e limite dei tentativi', async t => {
  const app=await createApp({...await testDatabase(),dataDir:resolve('work/tests',randomUUID()),port:0,localMode:true,scheduler:false,smtpHost:'',openaiKey:'',textModel:'',imageModel:''});
  t.after(()=>app.close());
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+app.server.address().port;
  const post=async(path,body)=>{
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    return {status:response.status,data:await response.json()};
  };
  const register=async email=>{
    assert.equal((await post('/api/auth/register',{email,password:'Concurrency-test-password'})).status,200);
    return (await app.db.prepare('SELECT body FROM mail WHERE recipient=? ORDER BY created_at DESC').get(email)).body.match(/\b\d{6}\b/)[0];
  };
  const emails=['parallel-a@example.test','parallel-b@example.test'];
  const codes=await Promise.all(emails.map(register));
  const verified=await Promise.all(emails.map((email,i)=>post('/api/auth/verify',{email,otpCode:codes[i]})));
  assert.deepEqual(verified.map(result=>result.status),[200,200]);
  assert.equal(verified.filter(result=>result.data.role==='admin').length,1);
  const email='once@example.test',code=await register(email);
  const once=await Promise.all([1,2,3].map(()=>post('/api/auth/verify',{email,otpCode:code})));
  assert.equal(once.filter(result=>result.status===200).length,1);
  assert.equal(once.filter(result=>result.status===400).length,2);
  const blocked='attempts@example.test',valid=await register(blocked);
  const failures=await Promise.all([1,2,3,4,5].map(()=>post('/api/auth/verify',{email:blocked,otpCode:'not-the-code'})));
  assert.ok(failures.every(result=>result.status===400));
  assert.equal((await app.db.prepare('SELECT attempts FROM challenges WHERE email=?').get(blocked)).attempts,5);
  assert.equal((await post('/api/auth/verify',{email:blocked,otpCode:valid})).status,400);
  const duplicates=await Promise.all([1,2].map(()=>post('/api/auth/register',{email:'duplicate@example.test',password:'Concurrency-test-password'})));
  assert.deepEqual(duplicates.map(result=>result.status).sort(),[200,409]);
});
