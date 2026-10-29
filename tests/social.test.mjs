import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID, randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { readConnections, writeConnection } from '../server/social-connections.mjs';
import { validateSocialImage, validateTikTokOptions } from '../server/social-publishing.mjs';
import { digest, now } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { testDatabase } from './helpers/database.mjs';
import { socialReturnPath } from '../shared/social-return.mjs';

const permissions = list => ({ data: list.map(permission => ({ permission, status: 'granted' })) });
const creator = { creator_nickname: 'Cliente test', privacy_level_options: ['SELF_ONLY', 'PUBLIC_TO_EVERYONE'], comment_disabled: true };
const options = { title: 'Titolo della foto', privacy_level: 'SELF_ONLY', disable_comment: true, auto_add_music: false, brand_content_toggle: false, brand_organic_toggle: false, is_aigc: false, music_consent: true, commercial_disclosure: false };
// Header JPEG minimo per verificare le dimensioni: nessun provider reale riceve questa fixture.
const jpeg = Buffer.from([255,216,255,192,0,11,8,4,56,4,56,1,1,17,0,255,217]);

async function fixture(t) {
  const seen = [], control = { timeout: false, igStatus: 'FINISHED', ttStatus: 'PROCESSING_DOWNLOAD', revoked: false };
  const fetchImpl = async (value, init = {}) => {
    const url = new URL(value); seen.push({ url, init });
    await control.before?.(url, init);
    if (control.revoked && url.pathname.endsWith('/me/permissions')) return Response.json({ error: { code: 190 } }, { status: 401 });
    if (url.hostname === 'graph.facebook.com') {
      if (url.pathname.endsWith('/oauth/access_token')) return Response.json({ access_token: 'fb-secret-fixture' });
      if (url.pathname.endsWith('/me/permissions')) return Response.json(permissions(['pages_show_list','pages_read_engagement','pages_manage_posts']));
      if (url.pathname.endsWith('/me/accounts')) return Response.json({ data: [{ id: 'page1', name: 'Pagina uno', access_token: 'page-secret-fixture', tasks:['CREATE_CONTENT'] }, { id:'page2', name:'Pagina due', access_token:'page2-secret-fixture', tasks:['CREATE_CONTENT'] }] });
      if (url.pathname.endsWith('/photos')) { if (control.timeout) throw new Error('simulated network interruption'); return Response.json({ post_id: '123_456' }); }
    }
    if (url.hostname === 'api.instagram.com') return Response.json({ access_token: 'ig-short-fixture' });
    if (url.hostname === 'graph.instagram.com') {
      if (url.pathname === '/access_token' || url.pathname === '/refresh_access_token') return Response.json({ access_token:'ig-secret-fixture', expires_in:5184000 });
      if (url.pathname.endsWith('/me/permissions')) return Response.json(permissions(['instagram_business_basic','instagram_business_content_publish']));
      if (url.pathname.endsWith('/me')) return Response.json({ user_id:'ig1', username:'cliente', account_type:'BUSINESS' });
      if (url.pathname.endsWith('/media_publish')) { if (control.timeout) throw new Error('simulated network interruption'); return Response.json({ id:'media1' }); }
      if (url.pathname.endsWith('/media')) return Response.json({ id:'container1' });
      if (url.pathname.endsWith('/container1')) return Response.json({ status_code:control.igStatus });
      if (url.pathname.endsWith('/media1')) return Response.json({ permalink:'https://www.instagram.com/p/example/' });
    }
    if (url.hostname === 'open.tiktokapis.com') {
      if (url.pathname.endsWith('/oauth/token/')) return Response.json({ access_token:'tt-secret-fixture', refresh_token:'tt-refresh-fixture', open_id:'tt1', scope:'user.info.basic,video.publish', expires_in:86400 });
      if (url.pathname.endsWith('/user/info/')) return Response.json({ data:{ user:{ open_id:'tt1', display_name:'Cliente test' } }, error:{ code:'ok' } });
      if (url.pathname.endsWith('/creator_info/query/')) return Response.json({ data:creator, error:{ code:'ok' } });
      if (url.pathname.endsWith('/content/init/')) return Response.json({ data:{ publish_id:'tt-post1' }, error:{ code:'ok' } });
      if (url.pathname.endsWith('/status/fetch/')) return Response.json({ data:{ status:control.ttStatus, fail_reason:'photo_pull_failed' }, error:{ code:'ok' } });
    }
    assert.fail('Unexpected provider request: ' + url.origin + url.pathname);
  };
  const app = await createApp({ ...await testDatabase(), dataDir:resolve('work/tests',randomUUID()), port:0, localMode:false, origin:'https://app.example.test', scheduler:false, smtpHost:'', openaiKey:'', stripeKey:'', metaId:'meta-test', metaSecret:'secret-test', metaLoginConfigId:'', instagramId:'ig-test', instagramSecret:'secret-test', tiktokKey:'tt-test', tiktokSecret:'secret-test', fetchImpl });
  t.after(() => app.close());
  const user = { id:randomUUID(), plan:'pro', role:'user' }, other = { id:randomUUID(), plan:'pro', role:'user' };
  for (const u of [user, other]) await app.db.prepare('INSERT INTO users(id,email,verified,plan,created_at) VALUES (?,?,1,?,?)').run(u.id,u.id+'@example.test',u.plan,now());
  const social = app.integrations.social, publication = app.integrations.publication;
  async function link(provider, owner = user) {
    const start = await social.begin(owner, provider, true);
    const authorized = await social.authorize(start.id, new URL(start.url).searchParams.get('ticket'));
    await social.complete(provider, start.id, authorized.browser, 'fixture-code', false);
    const flow = await social.flow(owner, start.id);
    assert.equal(flow.stage,'choose',flow.message);
    await social.confirm(owner,start.id,[flow.accounts[0].id]);
    return start;
  }
  async function post(provider, owner = user) {
    const file = await saveImage(app.db,app.config,owner,jpeg,'fixture.jpg');
    const id=randomUUID();
    await app.db.prepare('INSERT INTO posts(id,user_id,data,created_at,updated_at) VALUES (?,?,?,?,?)').run(id,owner.id,JSON.stringify({ platform:provider, image_url:file.file_url, status:'pronto', mode:'original', caption:'Testo', title:'Titolo' }),now(),now());
    return { id, image_url:file.file_url };
  }
  const getPost = async id => JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(id)).data);
  const tick = async id => { const data=await getPost(id); if(data.social_job) data.social_job.leaseUntil=0; await app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify(data),id); await publication.publishDuePosts(); };
  return { app, social, publication, user, other, link, post, getPost, tick, seen, control, fetchImpl };
}

test('OAuth social: separazione clienti, consenso del browser, replay e selezione esplicita',async t => {
  const f=await fixture(t);
  const start=await f.social.begin(f.user,'facebook',true);
  await assert.rejects(()=>f.social.flow(f.other,start.id),e=>e.status===404);
  await assert.rejects(()=>f.social.authorize(start.id,'incorrect'),e=>e.status===400);
  const auth=await f.social.authorize(start.id,new URL(start.url).searchParams.get('ticket'));
  await assert.rejects(()=>f.social.authorize(start.id,new URL(start.url).searchParams.get('ticket')),e=>e.status===400);
  await assert.rejects(()=>f.social.complete('facebook',start.id,'wrong-browser','code'),e=>e.status===400);
  await f.social.complete('facebook',start.id,auth.browser,'code');
  assert.deepEqual(await readConnections(f.app.db,f.app.config,f.user.id),{});
  const result=await f.social.flow(f.user,start.id);
  assert.equal(result.accounts.length,2);
  assert.ok(!JSON.stringify(result).includes('secret-fixture'));
  assert.ok(!(await f.app.db.prepare('SELECT data FROM oauth_states').get()).data.includes('fb-secret-fixture'));
  await assert.rejects(()=>f.social.confirm(f.other,start.id,['page1']),e=>e.status===404);
  await assert.rejects(()=>f.social.confirm(f.user,start.id,['not-granted']),e=>e.status===400);
  await f.social.confirm(f.user,start.id,['page2']);
  assert.equal((await readConnections(f.app.db,f.app.config,f.user.id)).facebook.pages[0].id,'page2');
  await assert.rejects(()=>f.social.confirm(f.user,start.id,['page2']),e=>e.status===410);
});

test('Instagram e TikTok si aggiungono senza sovrascrivere Facebook; cancellazione e scadenza',async t => {
  const f=await fixture(t);
  for(const p of ['facebook','instagram','tiktok']) await f.link(p);
  assert.deepEqual(Object.keys(await readConnections(f.app.db,f.app.config,f.user.id)).sort(),['facebook','instagram','tiktok']);
  const start=await f.social.begin(f.user,'instagram');
  const auth=await f.social.authorize(start.id,new URL(start.url).searchParams.get('ticket'));
  await f.social.complete('instagram',start.id,auth.browser,'',true);
  assert.equal((await f.social.flow(f.user,start.id)).stage,'error');
  assert.ok((await readConnections(f.app.db,f.app.config,f.user.id)).instagram);
  await f.social.cancel(f.user,start.id);
  const expired=await f.social.begin(f.user,'facebook');
  await f.app.db.prepare('UPDATE oauth_states SET expires=0 WHERE hash=?').run(digest(f.app.config,expired.id));
  await assert.rejects(()=>f.social.flow(f.user,expired.id),e=>e.status===410);
  f.control.revoked=true;
  assert.equal((await f.social.status(f.user,true)).facebook.state,'reconnect');
  assert.ok((await readConnections(f.app.db,f.app.config,f.user.id)).facebook);
});

test('collegamento confermato: esito condiviso tra finestre, privato, privo di token e non riutilizzabile', async t => {
  const f = await fixture(t);
  for (const provider of ['facebook', 'instagram', 'tiktok']) {
    const start = await f.link(provider);
    const connection = await readConnections(f.app.db, f.app.config, f.user.id);
    const result = await f.social.flow(f.user, start.id);
    assert.equal(result.stage, 'completed');
    assert.deepEqual(result.accounts, []);
    const receipt = await f.app.db.prepare('SELECT data,expires FROM oauth_states WHERE hash=?').get(digest(f.app.config, start.id));
    assert.deepEqual(JSON.parse(receipt.data), { userId: f.user.id, stage: 'completed' });
    assert.ok(receipt.expires > Date.now() && receipt.expires <= Date.now() + 15 * 60000);
    await assert.rejects(() => f.social.flow(f.other, start.id), e => e.status === 404);
    await assert.rejects(() => f.social.confirm(f.other, start.id, ['other']), e => e.status === 404);
    await assert.rejects(() => f.social.cancel(f.other, start.id), e => e.status === 404);
    await assert.rejects(() => f.social.confirm(f.user, start.id, ['other']), e => e.status === 410);
    assert.equal((await f.social.cancel(f.user, start.id)).stage, 'completed');
    assert.equal((await f.social.flow(f.user, start.id)).stage, 'completed');
    assert.deepEqual(await readConnections(f.app.db, f.app.config, f.user.id), connection);
  }
});

test('annullamento durante il consenso: nessun ripristino tardivo e collegamento precedente conservato', async t => {
  const f = await fixture(t);
  await f.link('facebook');
  const previous = await readConnections(f.app.db, f.app.config, f.user.id);
  const start = await f.social.begin(f.user, 'facebook', true);
  const auth = await f.social.authorize(start.id, new URL(start.url).searchParams.get('ticket'));
  let release, entered;
  const blocked = new Promise(resolve => { release = resolve; });
  const waiting = new Promise(resolve => { entered = resolve; });
  f.control.before = async url => { if (url.pathname.endsWith('/oauth/access_token')) { entered(); await blocked; } };
  const pending = f.social.complete('facebook', start.id, auth.browser, 'fixture-code');
  try {
    await waiting;
    assert.equal((await f.social.cancel(f.user, start.id)).stage, 'cancelled');
    assert.equal((await f.social.flow(f.user, start.id)).stage, 'cancelled');
  } finally { release(); }
  const completed = await pending;
  assert.match(completed.message, /già stato chiuso/);
  assert.equal((await f.social.cancel(f.user, start.id)).stage, 'cancelled');
  const receipt = await f.app.db.prepare('SELECT data FROM oauth_states WHERE hash=?').get(digest(f.app.config, start.id));
  assert.deepEqual(JSON.parse(receipt.data), { userId: f.user.id, stage: 'cancelled' });
  await assert.rejects(() => f.social.confirm(f.user, start.id, ['page2']), e => e.status === 410);
  assert.deepEqual(await readConnections(f.app.db, f.app.config, f.user.id), previous);
});

test('scadenza delle ricevute: pulizia senza rimuovere gli account confermati', async t => {
  const f = await fixture(t), start = await f.link('instagram');
  await f.app.db.prepare('UPDATE oauth_states SET expires=0 WHERE hash=?').run(digest(f.app.config, start.id));
  await assert.rejects(() => f.social.flow(f.user, start.id), e => e.status === 410);
  await f.social.begin(f.user, 'tiktok');
  assert.equal(await f.app.db.prepare('SELECT data FROM oauth_states WHERE hash=?').get(digest(f.app.config, start.id)), undefined);
  assert.ok((await readConnections(f.app.db, f.app.config, f.user.id)).instagram);
});

test('ritorno nativo: browser senza sessione ClickSocial, conferma solo con sessione proprietaria',async t => {
  const f=await fixture(t);
  const session=randomBytes(32).toString('hex');
  await f.app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(f.app.config,session),f.user.id,Date.now()+600000);
  await new Promise(resolve=>f.app.server.listen(0,'127.0.0.1',resolve));
  const base='http://127.0.0.1:'+f.app.server.address().port;
  const headers={Authorization:'Bearer '+session,'X-ClickSocial-Client':'native','Content-Type':'application/json'};
  const begin=await fetch(base+'/api/social/facebook/connect',{method:'POST',headers,body:'{}'});
  assert.equal(begin.status,200);
  const start=await begin.json(), url=new URL(start.url);
  const browser=await fetch(base+url.pathname+url.search,{redirect:'manual'});
  assert.equal(browser.status,302);
  const cookie=browser.headers.getSetCookie()[0].split(';')[0];
  const callback=await fetch(base+'/api/social/facebook/callback?state='+start.id+'&code=fixture-code',{headers:{Cookie:cookie}});
  const html=await callback.text();
  assert.ok(html.includes('it.sodanoconsulting.clicksocial://social-return?flow='+start.id));
  assert.ok(!html.includes('secret-fixture'));
  assert.equal((await fetch(base+'/api/social/flows/'+start.id)).status,401);
  assert.equal((await fetch(base+'/api/social/flows/'+start.id+'/confirm',{method:'POST',headers,body:JSON.stringify({account_ids:['page1']})})).status,200);
});

test('pubblicazione Facebook: conferma, proprietà, atomicità e risultato remoto',async t => {
  const f=await fixture(t); await f.link('facebook');
  const p=await f.post('facebook'), other=await f.post('facebook',f.other);
  const body={post_id:p.id,account_id:'page1',image_url:p.image_url,caption:'Testo inviato',confirmed:true};
  await assert.rejects(()=>f.publication.enqueue(f.user,{...body,confirmed:false}),e=>e.status===400);
  await assert.rejects(()=>f.publication.enqueue(f.other,body),e=>e.status===404);
  await assert.rejects(()=>f.publication.enqueue(f.user,{...body,image_url:other.image_url}),e=>e.status===404);
  await assert.rejects(()=>f.publication.enqueue(f.user,{...body,account_id:'page2'}),e=>e.status===400);
  await f.publication.enqueue(f.user,body);
  const otherWorker=createIntegrations(f.app.db,f.app.config,f.fetchImpl);
  await Promise.all([f.publication.publishDuePosts(),otherWorker.publishDuePosts()]);
  assert.equal(f.seen.filter(item=>item.url.pathname.endsWith('/photos')).length,1);
  assert.equal((await f.getPost(p.id)).status,'pubblicato');
  assert.equal((await f.getPost(p.id)).published_url,'https://www.facebook.com/123_456');
  await assert.rejects(()=>f.publication.enqueue(f.user,body),e=>e.status===409);
});

test('esito ambiguo: nessun secondo invio automatico, verifica esplicita e blocco modifiche',async t => {
  const f=await fixture(t); await f.link('facebook');
  const p=await f.post('facebook');
  await f.publication.enqueue(f.user,{post_id:p.id,account_id:'page1',caption:'Testo',confirmed:true});
  f.control.timeout=true;
  await f.publication.publishDuePosts(); await f.tick(p.id);
  assert.equal((await f.getPost(p.id)).status,'da_verificare');
  assert.equal(f.seen.filter(item=>item.url.pathname.endsWith('/photos')).length,1);
  await assert.rejects(()=>f.social.disconnect(f.user,'facebook'),e=>e.status===409);
  const reconnect = await f.social.begin(f.user,'facebook');
  const browser = await f.social.authorize(reconnect.id,new URL(reconnect.url).searchParams.get('ticket'));
  await f.social.complete('facebook',reconnect.id,browser.browser,'fixture-code');
  await assert.rejects(()=>f.social.confirm(f.user,reconnect.id,['page2']),e=>e.status===409);
  await f.social.confirm(f.user,reconnect.id,['page1']);
  await assert.rejects(()=>f.publication.resolve(f.user,p.id,{outcome:'not_published'}),e=>e.status===400);
  await assert.rejects(()=>f.publication.resolve(f.other,p.id,{checked:true,outcome:'not_published'}),e=>e.status===404);
  await f.publication.resolve(f.user,p.id,{checked:true,outcome:'published'});
  assert.equal((await f.getPost(p.id)).status,'pubblicato');
});

test('Instagram: media temporaneo firmato, elaborazione e conferma pubblicazione',async t => {
  const f=await fixture(t); await f.link('instagram');
  const p=await f.post('instagram');
  await f.publication.enqueue(f.user,{post_id:p.id,account_id:'ig1',caption:'Testo IG',confirmed:true});
  f.control.igStatus='IN_PROGRESS'; await f.publication.publishDuePosts();
  assert.equal((await f.getPost(p.id)).status,'in_pubblicazione');
  const request=f.seen.find(item=>item.url.pathname.endsWith('/media'));
  const image=new URL(request.init.body.get('image_url'));
  const expires=image.searchParams.get('expires'), signature=image.searchParams.get('signature');
  assert.equal((await f.publication.media(p.id,expires,signature)).user_id,f.user.id);
  await assert.rejects(()=>f.publication.media(p.id,expires,'0'.repeat(64)),e=>e.status===404);
  await assert.rejects(()=>f.publication.media(p.id,String(Date.now()-1000),signature),e=>e.status===404);
  const another=await f.post('instagram');
  await assert.rejects(()=>f.publication.media(another.id,expires,signature),e=>e.status===404);
  f.control.igStatus='FINISHED'; await f.tick(p.id);
  assert.equal((await f.getPost(p.id)).status,'pubblicato');
  await f.tick(p.id);
  assert.equal(f.seen.filter(item=>item.url.pathname.endsWith('/media_publish')).length,1);
});

test('TikTok: opzioni reali, token rinnovato e stato di pubblicazione asincrono',async t => {
  const f=await fixture(t); await f.link('tiktok');
  const stored=(await readConnections(f.app.db,f.app.config,f.user.id)).tiktok;
  await writeConnection(f.app.db,f.app.config,f.user.id,'tiktok',{...stored,expiresAt:0});
  await Promise.all([f.social.connection(f.user,'tiktok'),f.social.connection(f.user,'tiktok')]);
  assert.equal(f.seen.filter(item=>item.url.pathname.endsWith('/oauth/token/') && item.init.body.get('grant_type')==='refresh_token').length,1);
  const p=await f.post('tiktok');
  const body={post_id:p.id,account_id:'tt1',caption:'Foto test',confirmed:true,options};
  await assert.rejects(()=>f.publication.enqueue(f.user,{...body,options:{...options,privacy_level:''}}),e=>e.status===409);
  await f.publication.enqueue(f.user,body); await f.publication.publishDuePosts();
  assert.equal((await f.getPost(p.id)).status,'in_pubblicazione');
  const sent=JSON.parse(f.seen.find(item=>item.url.pathname.endsWith('/content/init/')).init.body);
  assert.equal(sent.media_type,'PHOTO'); assert.equal(sent.is_aigc,false); assert.equal(sent.post_info.privacy_level,'SELF_ONLY');
  f.control.ttStatus='PUBLISH_COMPLETE'; await f.tick(p.id);
  assert.equal((await f.getPost(p.id)).status,'pubblicato');
  assert.equal(f.seen.filter(item=>item.url.pathname.endsWith('/content/init/')).length,1);
});

test('scollega solo il social scelto e conserva il calendario e gli altri provider',async t => {
  const f=await fixture(t); await f.link('facebook'); await f.link('instagram');
  const p=await f.post('facebook'), q=await f.post('instagram');
  const date=new Date(Date.now()+3600000).toISOString();
  await f.publication.enqueue(f.user,{post_id:p.id,account_id:'page1',caption:'FB',scheduled_at:date,confirmed:true});
  await f.publication.enqueue(f.user,{post_id:q.id,account_id:'ig1',caption:'IG',scheduled_at:date,confirmed:true});
  await f.social.disconnect(f.user,'facebook');
  assert.equal((await f.getPost(p.id)).status,'pronto'); assert.equal((await f.getPost(p.id)).editorial_at,date);
  assert.equal((await f.getPost(q.id)).status,'in_coda');
  assert.deepEqual(Object.keys(await readConnections(f.app.db,f.app.config,f.user.id)),['instagram']);
});

test('validazione formato, consenso TikTok e link mobile senza credenziali',()=>{
  validateSocialImage({mime:'image/jpeg',bytes:jpeg},'instagram');
  assert.throws(()=>validateSocialImage({mime:'image/png',bytes:jpeg},'instagram'));
  const vertical=Buffer.from(jpeg); vertical.writeUInt16BE(1920,7);
  assert.throws(()=>validateSocialImage({mime:'image/jpeg',bytes:vertical},'instagram'));
  assert.throws(()=>validateTikTokOptions({...options,music_consent:false},creator));
  assert.throws(()=>validateTikTokOptions({...options,disable_comment:false},creator));
  assert.throws(()=>validateTikTokOptions({...options,brand_content_toggle:true},creator));
  const id='a'.repeat(64);
  assert.equal(socialReturnPath('it.sodanoconsulting.clicksocial://social-return?flow='+id),'/profilo?section=social&social_flow='+id);
  for(const value of ['https://attacker.test/?flow='+id,'it.sodanoconsulting.clicksocial://elsewhere?flow='+id,'it.sodanoconsulting.clicksocial://social-return?flow=secret','it.sodanoconsulting.clicksocial://social-return/anything?flow='+id]) assert.equal(socialReturnPath(value),null);
});

test('invio in corso: scollegamento bloccato e attesa del lavoro prima della chiusura', async t => {
  const f = await fixture(t); await f.link('facebook');
  const p = await f.post('facebook');
  await f.publication.enqueue(f.user, { post_id:p.id, account_id:'page1', caption:'Testo', confirmed:true });
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  f.control.before = async url => { if (url.pathname.endsWith('/photos')) { entered(); await gate; } };
  const running = f.publication.publishDuePosts();
  await started;
  try {
    assert.equal(f.publication.waitForIdle(), running);
    assert.equal(f.publication.publishDuePosts(), running);
    await assert.rejects(() => f.social.disconnect(f.user, 'facebook'), e => e.status === 409);
    assert.equal((await f.getPost(p.id)).status, 'in_pubblicazione');
  } finally { release(); await running; }
  assert.equal((await f.getPost(p.id)).status, 'pubblicato');
  assert.ok(!f.publication.waitForIdle());
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/photos')).length, 1);
});

test('riavvio: invio senza ricevuta da verificare, invio TikTok ricevuto solo da controllare', async t => {
  const f = await fixture(t); await f.link('facebook'); await f.link('tiktok');
  const p = await f.post('facebook');
  await f.publication.enqueue(f.user, { post_id:p.id, account_id:'page1', caption:'Testo', confirmed:true });
  const interrupted = await f.getPost(p.id);
  interrupted.status = 'in_pubblicazione'; interrupted.social_job.phase = 'commit'; interrupted.social_job.leaseUntil = 0;
  await f.app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify(interrupted), p.id);
  const worker = createIntegrations(f.app.db, f.app.config, f.fetchImpl);
  await worker.publishDuePosts();
  assert.equal((await f.getPost(p.id)).status, 'da_verificare');
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/photos')).length, 0);
  const q = await f.post('tiktok');
  await f.publication.enqueue(f.user, { post_id:q.id, account_id:'tt1', caption:'Testo', options, confirmed:true });
  await worker.publishDuePosts();
  const waiting = await f.getPost(q.id); waiting.social_job.leaseUntil = 0;
  await f.app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify(waiting), q.id);
  f.control.ttStatus = 'PUBLISH_COMPLETE';
  await createIntegrations(f.app.db, f.app.config, f.fetchImpl).publishDuePosts();
  assert.equal((await f.getPost(q.id)).status, 'pubblicato');
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/content/init/')).length, 1);
});

test('elaborazione rifiutata dai social: fallimento esplicito senza reinvii', async t => {
  const f = await fixture(t); await f.link('instagram'); await f.link('tiktok');
  const p = await f.post('instagram'), q = await f.post('tiktok');
  f.control.igStatus = 'ERROR'; f.control.ttStatus = 'FAILED';
  await f.publication.enqueue(f.user, { post_id:p.id, account_id:'ig1', caption:'Testo', confirmed:true });
  await f.publication.enqueue(f.user, { post_id:q.id, account_id:'tt1', caption:'Testo', options, confirmed:true });
  await f.publication.publishDuePosts(); await f.publication.publishDuePosts();
  assert.equal((await f.getPost(p.id)).status, 'fallito'); assert.equal((await f.getPost(q.id)).status, 'fallito');
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/media_publish')).length, 0);
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/content/init/')).length, 1);
});

test('rinnovo token tra due istanze: una sola richiesta e nessuna sovrascrittura della riconnessione', async t => {
  const f = await fixture(t); await f.link('tiktok');
  const current = (await readConnections(f.app.db, f.app.config, f.user.id)).tiktok;
  await writeConnection(f.app.db, f.app.config, f.user.id, 'tiktok', { ...current, expiresAt:0 });
  let release, entered;
  const gate = new Promise(resolve => { release = resolve; });
  const started = new Promise(resolve => { entered = resolve; });
  f.control.before = async (url, init) => {
    if (url.pathname.endsWith('/oauth/token/') && init.body.get('grant_type') === 'refresh_token') { entered(); await gate; }
  };
  const pending = f.social.connection(f.user, 'tiktok');
  // Si registra subito la gestione del rifiuto previsto dopo la riconnessione.
  const outcome = pending.then(value => ({ value }), error => ({ error }));
  await started;
  try {
    const worker = createIntegrations(f.app.db, f.app.config, f.fetchImpl);
    await assert.rejects(() => worker.social.connection(f.user, 'tiktok'), e => e.status === 503);
    await f.link('tiktok');
  } finally { release(); }
  assert.equal((await outcome).error?.status, 409);
  const saved = (await readConnections(f.app.db, f.app.config, f.user.id)).tiktok;
  assert.equal(saved.refreshLease, undefined); assert.ok(saved.expiresAt > Date.now());
  assert.equal(f.seen.filter(item => item.url.pathname.endsWith('/oauth/token/') && item.init.body.get('grant_type') === 'refresh_token').length, 1);
});
