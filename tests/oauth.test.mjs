import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { testDatabase } from './helpers/database.mjs';

test('OAuth Google: consenso legato al browser, account esistenti e redirect sicuri', async t => {
  const email='oauth-owner@example.test';
  const app=(await createApp({...await testDatabase(),dataDir:resolve('work/tests',randomUUID()),port:0,origin:'http://127.0.0.1:5180',localMode:true,scheduler:false,
    smtpHost:'',googleId:'test-client',googleSecret:'test-secret',metaId:'test-meta',metaSecret:'test-secret',
    fetchImpl:async(url,options)=>{
      if(url==='https://oauth2.googleapis.com/token') {
        assert.ok(options.body.get('code_verifier')?.length>40);
        return Response.json({access_token:'fake-token-used-only-in-tests'});
      }
      if(url==='https://openidconnect.googleapis.com/v1/userinfo') return Response.json({sub:'google-test-subject',email,email_verified:true});
      throw new Error('Unexpected external request');
    }}));
  await new Promise(resolve=>app.server.listen(0,'127.0.0.1',resolve));
  t.after(async ()=>(await app.close()));
  const base='http://127.0.0.1:'+app.server.address().port;
  function browser(){
    const jar=new Map();
    return async(path,body)=>{
      const response=await fetch(base+path,{method:body?'POST':'GET',redirect:'manual',headers:{Cookie:[...jar].map(([k,v])=>k+'='+v).join('; '),...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
      for(const item of response.headers.getSetCookie()) { const [name,...rest]=item.split(';')[0].split('='); jar.set(name,rest.join('=')); }
      return {status:response.status,headers:response.headers,data:await response.json().catch(()=>null)};
    };
  }
  const owner=browser(),visitor=browser();
  await owner('/api/auth/register',{email,password:'OAuth-local-test-password'});
  const code=(await app.db.prepare('SELECT body FROM mail WHERE recipient=?').get(email)).body.match(/\b\d{6}\b/)[0];
  const user=(await owner('/api/auth/verify',{email,otpCode:code})).data;
  async function begin(client,returnTo='/profilo'){
    const result=await client('/api/oauth/google/start',{returnTo});
    assert.equal(result.status,200);
    const url=new URL(result.data.url);
    assert.equal(url.searchParams.get('code_challenge_method'),'S256');
    return '/api/oauth/google/callback?state='+url.searchParams.get('state')+'&code=test-code';
  }
  const unlinked=await begin(visitor);
  assert.equal((await owner(unlinked)).status,400);
  assert.equal((await visitor(unlinked)).status,409);
  assert.equal((await visitor('/api/auth/me')).status,401);
  const link=await begin(owner,'/.//outside.example');
  const linked=await owner(link);
  assert.equal(linked.status,302);
  assert.equal(linked.headers.get('location'),'/');
  assert.equal((await app.db.prepare('SELECT user_id FROM oauth_identities').get()).user_id,user.id);
  assert.equal((await owner(link)).status,400);
  const login=await begin(visitor);
  const concurrent=await Promise.all([visitor(login),visitor(login)]);
  assert.deepEqual(concurrent.map(result=>result.status).sort(),[302,400]);
  assert.equal((await visitor('/api/auth/me')).data.id,user.id);
  const fb=(await app.integrations.beginOAuth('facebook',user,'/profilo'));
  await assert.rejects(()=>app.integrations.finishOAuth('facebook',fb.state,'code',fb.state,'another-user'),error=>error.status===401);
});
