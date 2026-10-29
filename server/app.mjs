import { SQL } from './sql.mjs';
import { createServer } from 'node:http';
import { randomBytes, randomInt } from 'node:crypto';
import { readFileSync, existsSync, statSync, unlinkSync } from 'node:fs';
import { join, resolve, sep, extname } from 'node:path';
import { loadConfig } from './config.mjs';
import { openStore, fail, now, uid, safeUser, postRecord, digest, hashPassword, checkPassword, transaction } from './store.mjs';
import { saveImage, ownedImage, ownedFile, saveFont } from './files.mjs';
import { validateBrand, validateDesign, validatePlanning } from './design.mjs';
import { getTemplate, defaultDesign } from '../shared/templates.mjs';
import { createIntegrations } from './integrations.mjs';
import { aiPricingSettings, withAiCosts } from './ai-pricing.mjs';
import { instant, editablePost, planPost, cancelSchedule } from './editorial.mjs';
import { postDownload } from './zip.mjs';
import { sessionToken, isNativeRequest, mobileRequestPolicy } from './mobile-access.mjs';
import { createClientAddressResolver } from './client-address.mjs';

const profileFields = ['company_name','company_field','brand_identity','tone_of_voice','company_logo_url','setup_completed','brand_settings','preferred_template'];
const postFields = ['title','image_url','original_image_url','graphic_url','editor_filters','editor_preset','headline','caption','hashtags','context','platform','format','mode','tone','quality','company_name','status','design','planning','editorial_at','graphic_subtitle'];
const escapeHtml = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const emailValue = value => {
  const email = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400, 'Indirizzo email non valido.');
  return email;
};

export async function createApp(options = {}) {
  const config = loadConfig(options);
  const clientAddress = createClientAddressResolver(config.proxyMode);
  const db = (await openStore(config));
  const integrations = createIntegrations(db, config, options.fetchImpl);
  const limits = new Map();
  function rateLimit(req, tag, max = 30, user = null) {
    const key = (user ? 'user:' + user.id : 'ip:' + clientAddress(req)) + ':' + tag;
    const current = limits.get(key);
    const window = !current || current.expires < Date.now() ? { count: 0, expires: Date.now()+600000 } : current;
    if (++window.count > max) fail(429, 'Troppi tentativi. Attendi qualche minuto e riprova.');
    limits.set(key, window);
    if (limits.size > 10000) for (const [k,v] of limits) if (v.expires < Date.now()) limits.delete(k);
  }
  const cookie = (req, name) => {
    const pair = (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith(name+'='));
    return pair ? pair.slice(name.length+1) : '';
  };
  function setCookie(res, name, value, seconds) {
    const item = name + '=' + value + '; Path=/; HttpOnly; SameSite=Lax; Max-Age=' + seconds + (config.origin.startsWith('https:') ? '; Secure' : '');
    res.setHeader('Set-Cookie', [...(res.getHeader('Set-Cookie') || []), item]);
  }
  async function session(res, userId, native = false) {
    (await db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now()));
    const token = randomBytes(32).toString('hex');
    (await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(config,token), userId, Date.now()+7*86400000));
    if (!native) setCookie(res, 'clicksocial_session', token, 7*86400);
    return token;
  }
  async function signInResult(req, res, user) {
    const native = isNativeRequest(req);
    const token = await session(res, user.id, native);
    return { ...safeUser(user), ...(native ? { session_token: token } : {}) };
  }
  async function currentUser(req) {
    const token = sessionToken(req);
    if (!token) return null;
    return (await db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.hash=? AND sessions.expires>? AND users.verified=1').get(digest(config,token), Date.now()));
  }
  const requiredUser = async req => (await currentUser(req)) || fail(401, 'Accedi per continuare.');
  const admin = user => { if (user.role !== 'admin') fail(403, 'Accesso riservato agli amministratori.'); };
  async function bodyBuffer(req, limit = 1024*1024) {
    let length = 0;
    const chunks = [];
    for await (const chunk of req) {
      length += chunk.length;
      if (length > limit) fail(413, 'File o richiesta troppo grande.');
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }
  async function bodyJson(req) {
    if (!String(req.headers['content-type'] || '').includes('application/json')) fail(415, 'Invia una richiesta JSON.');
    try { const data = JSON.parse((await bodyBuffer(req)).toString('utf8')); if (!data || Array.isArray(data) || typeof data !== 'object') fail(400,'Richiesta non valida.'); return data; }
    catch (error) { if (error.status) throw error; fail(400, 'JSON non valido.'); }
  }
  async function challenge(email, purpose) {
    const token = purpose === 'verify' ? String(randomInt(100000,1000000)) : randomBytes(32).toString('hex');
    (await db.prepare(SQL.challenge).run(email, purpose, digest(config, email+':'+token), Date.now()+1800000));
    return token;
  }
  async function verificationMail(email) {
    const token = (await challenge(email,'verify'));
    await integrations.sendMail(email, 'Verifica il tuo account ClickSocial', 'Il tuo codice di verifica e: ' + token + '\nScade tra 30 minuti.');
  }
  async function verifyChallenge(email, purpose, token) {
    const error = await transaction(db, async () => {
      const row = await db.prepare('SELECT * FROM challenges WHERE email=? AND purpose=?').get(email,purpose);
      if (!row || row.expires < Date.now() || row.attempts >= 5) return 'Codice o link scaduto. Richiedine uno nuovo.';
      await db.prepare('UPDATE challenges SET attempts=attempts+1 WHERE email=? AND purpose=?').run(email,purpose);
      // Anche i tentativi errati devono essere confermati nel database.
      if (row.hash !== digest(config,email+':'+String(token || ''))) return 'Codice o link non valido.';
      await db.prepare('DELETE FROM challenges WHERE email=? AND purpose=?').run(email,purpose);
      return null;
    });
    if (error) fail(400, error);
  }
  async function markVerified(email) {
    const first = config.localMode && (await db.prepare('SELECT COUNT(*) AS count FROM users WHERE verified=1').get()).count === 0;
    await db.prepare('UPDATE users SET verified=1,role=CASE WHEN ? THEN ? ELSE role END WHERE email=?').run(first ? 1 : 0, 'admin', email);
    return db.prepare('SELECT * FROM users WHERE email=?').get(email);
  }
  const verifyUser = email => transaction(db, () => markVerified(email));
  async function settings() {
    return { id: 'clicksocial-local', public_settings: {
      googleEnabled: !!(config.googleId && config.googleSecret), facebookEnabled: !!(config.metaId && config.metaSecret),
      aiEnabled: !!(config.openaiKey && config.textModel), imageAIEnabled: !!(config.openaiKey && config.imageModel),
      stripeEnabled: !!(config.stripeKey && config.stripePriceId), localMail: config.localMode && !config.smtpHost,
      localMode: config.localMode, firstAccountAdmin: config.localMode && (await db.prepare('SELECT COUNT(*) AS count FROM users WHERE verified=1').get()).count === 0,
    } };
  }
  function renderLocalMail(message) {
    const candidate = message.body.split(/\s+/).find(value => value.startsWith(config.origin + '/reset-password?'));
    let link = '';
    try {
      const url = new URL(candidate);
      if (url.origin === new URL(config.origin).origin && url.pathname === '/reset-password' && /^[a-f0-9]{64}$/.test(url.searchParams.get('token') || '')) link = '<p><a href="' + escapeHtml(url.href) + '">Apri la pagina per impostare la password</a></p>';
    } catch { /* Verification messages have no password link. */ }
    return '<article><h2>' + escapeHtml(message.subject) + '</h2><p>' + escapeHtml(message.recipient) + '<br>' + escapeHtml(message.created_at) + '</p><pre>' + escapeHtml(message.body) + '</pre>' + link + '</article>';
  }
  async function getPost(id, user) {
    const row = (await db.prepare('SELECT * FROM posts WHERE id=?').get(id));
    if (!row || row.user_id !== user.id) fail(404, 'Post non trovato.');
    return row;
  }
  async function validatePost(body, user, previous = {}) {
    if (Object.keys(body).some(key => !postFields.includes(key))) fail(400,'Il post contiene campi non modificabili.');
    const data = { platform: 'instagram', mode:'original', tone:'amichevole', status:'pronto', ...previous };
    for (const [key, value] of Object.entries(body)) {
      if (key === 'planning') { data.planning = validatePlanning(value); continue; }
      if (key === 'design') { data.design = await validateDesign(db, config, user, value, JSON.parse(user.profile)); data.format = data.design.format; continue; }
      if (key === 'editorial_at') { data.editorial_at = value === null ? null : instant(value); continue; }
      if (typeof value !== 'string' || value.length > 10000) fail(400, 'Campo del post non valido: ' + key);
      data[key] = value;
    }
    if (!['instagram','facebook','tiktok'].includes(data.platform)) fail(400,'Piattaforma non valida.');
    if (body.status && !['pronto','bozza'].includes(body.status)) fail(400,'Lo stato di pubblicazione viene gestito dal server.');
    if (!['original','enhance','creative'].includes(data.mode)) fail(400,'Modalita non valida.');
    if ('editorial_at' in body && !data.planning) fail(400, 'Usa la pianificazione del post per modificarne la data.');
    if (data.planning && !data.design) data.design = await validateDesign(db, config, user, defaultDesign(JSON.parse(user.profile)));
    if (data.planning && body.original_image_url) data.planning = { ...data.planning, stage: 'materiale_disponibile' };
    if (data.planning && !data.image_url) { data.status = 'bozza'; data.title = data.planning.topic; }
    else await ownedImage(db,config,user,data.image_url);
    if (data.design) data.format = data.design.format;
    if (data.original_image_url) (await ownedImage(db,config,user,data.original_image_url));
    if (data.graphic_url) (await ownedImage(db,config,user,data.graphic_url));
    if (data.editor_filters) {
      let filters;
      try { filters=JSON.parse(data.editor_filters); } catch { fail(400,'Filtri non validi.'); }
      const ranges={brightness:[50,150],contrast:[50,160],saturate:[0,200],warmth:[-60,80],blur:[0,8],vignette:[0,80]};
      if (!filters || typeof filters!=='object' || Array.isArray(filters) || Object.entries(filters).some(([key,value]) => !ranges[key] || !Number.isFinite(value) || value<ranges[key][0] || value>ranges[key][1])) fail(400,'Filtri non validi.');
    }
    return data;
  }
  async function schedulePost(user, body) {
    if (user.plan !== 'pro') fail(402,'La pubblicazione programmata e inclusa nel piano Pro.','pro_required');
    return transaction(db, async () => {
    const row = (await getPost(body.post_id,user));
    if (row.user_id !== user.id) fail(403,'Puoi programmare solo i tuoi post.');
    const data = JSON.parse(row.data);
    if (!data.image_url) fail(409, 'Genera e salva il post dalla bozza prima di programmarne l’invio.');
    if (['in_pubblicazione','da_verificare'].includes(data.status)) fail(409,'Attendi o verifica l’esito della pubblicazione precedente.');
    if (data.status === 'pubblicato') fail(409,'Questo post risulta già pubblicato.');
    if (data.social_job) fail(409,'Per modificare questo invio usa Pubblica foto nella versione aggiornata di ClickSocial.');
    if (data.platform !== 'facebook') fail(400,'La pubblicazione automatica e disponibile solo per le Pagine Facebook.');
    const when = new Date(instant(body.scheduled_at));
    if (!Number.isFinite(when.getTime()) || when.getTime() <= Date.now()) fail(400,'Scegli una data futura.');
    const state = await integrations.socialStatus(user);
    const page = state.facebook.pages.find(p => p.id === body.page_id);
    if (!page) fail(400,'Collega Facebook e seleziona una Pagina valida.');
    Object.assign(data, { status:'in_coda', scheduled_at:when.toISOString(), editorial_at:when.toISOString(), social_page_id:page.id, schedule_error:'' });
    const changed = (await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(data),now(),row.id,row.data)).changes;
    if (!changed) fail(409,'Il post è cambiato durante la programmazione. Aggiorna e riprova.');
    return { ok:true, page:page.name, scheduled_at:data.scheduled_at };
    });
  }
  async function route(req,res,url) {
    const path = url.pathname;
    const method = req.method;
    const social = integrations.social;
    const flowCookie = id => 'clicksocial_social_' + String(id || '').slice(0, 16);
    if (path === '/api/social/status' && method === 'GET') return social.status(await requiredUser(req), true);
    if (path === '/api/social/authorize' && method === 'GET') {
      rateLimit(req, 'social-authorize', 60);
      const id = url.searchParams.get('id');
      const result = await social.authorize(id, url.searchParams.get('ticket'));
      setCookie(res, flowCookie(id), result.browser, 900);
      res.writeHead(302, { Location: result.url, 'Referrer-Policy': 'no-referrer' }); res.end(); return;
    }
    const socialCallback = path.match(/^\/api\/social\/(facebook|instagram|tiktok)\/callback$/);
    if (socialCallback && method === 'GET') {
      const id = url.searchParams.get('state');
      let result;
      try { result = await social.complete(socialCallback[1], id, cookie(req, flowCookie(id)), url.searchParams.get('code'), url.searchParams.has('error')); }
      catch (error) { result = { message: error.status ? error.message : 'Collegamento non completato. Torna al Profilo e riprova.' }; }
      setCookie(res, flowCookie(id), '', 0);
      const back = result.id ? result.native ? 'it.sodanoconsulting.clicksocial://social-return?flow=' + result.id : '/profilo?section=social&social_flow=' + result.id : '/profilo?section=social';
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Referrer-Policy': 'no-referrer' });
      res.end('<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Collegamento social - ClickSocial</title><style>body{font:18px/1.6 system-ui;max-width:36rem;margin:3rem auto;padding:0 1.5rem;overflow-wrap:anywhere}a{display:inline-block;padding:1rem 0;color:#5430a2}</style><h1>Collegamento social</h1><p>' + escapeHtml(result.message) + '</p><a href="' + escapeHtml(back) + '">Torna a ClickSocial</a><p>Puoi anche chiudere questa finestra e tornare al Profilo nell’app già aperta.</p></html>'); return;
    }
    const socialAction = path.match(/^\/api\/social\/(facebook|instagram|tiktok)\/(connect|disconnect)$/);
    if (socialAction && method === 'POST') {
      const user = await requiredUser(req);
      rateLimit(req, 'social-connect', 60, user);
      if (socialAction[2] === 'disconnect') return social.disconnect(user, socialAction[1]);
      return social.begin(user, socialAction[1], isNativeRequest(req));
    }
    const socialFlow = path.match(/^\/api\/social\/flows\/([a-f0-9]{64})(?:\/(confirm|cancel))?$/);
    if (socialFlow) {
      const user = await requiredUser(req);
      if (method === 'GET' && !socialFlow[2]) return social.flow(user, socialFlow[1]);
      if (method === 'POST' && socialFlow[2] === 'confirm') return social.confirm(user, socialFlow[1], (await bodyJson(req)).account_ids);
      if (method === 'POST' && socialFlow[2] === 'cancel') return social.cancel(user, socialFlow[1]);
      fail(405, 'Operazione non consentita.');
    }
    const socialPost = path.match(/^\/api\/social\/posts\/([a-f0-9-]{36})\/(prepare|resolve)$/);
    if (socialPost) {
      const user = await requiredUser(req);
      if (method === 'GET' && socialPost[2] === 'prepare') return integrations.publication.prepare(user, socialPost[1]);
      if (method === 'POST' && socialPost[2] === 'resolve') return integrations.publication.resolve(user, socialPost[1], await bodyJson(req));
      fail(405, 'Operazione non consentita.');
    }
    if (path === '/api/social/publish' && method === 'POST') {
      const user = await requiredUser(req);
      rateLimit(req, 'social-publish', 60, user);
      return integrations.publication.enqueue(user, await bodyJson(req));
    }
    const socialMedia = path.match(/^\/api\/social\/media\/([a-f0-9-]{36})$/);
    if (socialMedia && ['GET', 'HEAD'].includes(method)) {
      const file = await integrations.publication.media(socialMedia[1], url.searchParams.get('expires'), url.searchParams.get('signature'));
      res.writeHead(200, { 'Content-Type': file.mime, 'Content-Length': file.bytes.length, 'Cache-Control': 'private, no-store', 'Referrer-Policy': 'no-referrer' });
      res.end(method === 'HEAD' ? undefined : file.bytes); return;
    }
    if (path === '/api/health' && method === 'GET') return { ok:true, database:!!(await db.prepare('SELECT 1 AS ok').get()).ok, database_driver:db.kind, backend:config.localMode ? 'local' : 'node' };
    if (path === '/api/settings' && method === 'GET') return (await settings());
    if (path === '/api/stripe/webhook' && method === 'POST') return integrations.stripeWebhook(await bodyBuffer(req), req.headers['stripe-signature']);
    if (path === '/api/auth/me' && method === 'GET') return safeUser((await requiredUser(req)));
    if (path === '/api/admin/summary' && method === 'GET') {
      admin((await requiredUser(req)));
      return { post_count:(await db.prepare('SELECT COUNT(*) AS count FROM posts').get()).count };
    }
    if (path === '/api/admin/ai-pricing' && method === 'GET') {
      admin(await requiredUser(req));
      return aiPricingSettings(config);
    }
    const editorialRoute = path.match(/^\/api\/posts\/([a-f0-9-]{36})\/(plan|cancel-schedule|mark-published|download)$/);
    if (editorialRoute) {
      const user = (await requiredUser(req)), [, id, action] = editorialRoute;
      const row = (await getPost(id,user)), data = JSON.parse(row.data);
      if (action === 'download' && method === 'GET') {
        const archive = postDownload(data,(await ownedImage(db,config,user,data.image_url)));
        res.writeHead(200,{'Content-Type':'application/zip','Content-Disposition':'attachment; filename="'+archive.name+'"','Content-Length':archive.bytes.length});
        res.end(archive.bytes); return;
      }
      if (action === 'plan' && method === 'PATCH') planPost(data,await bodyJson(req));
      else if (action === 'cancel-schedule' && method === 'POST') cancelSchedule(data);
      else if (action === 'mark-published' && method === 'POST') {
        editablePost(data);
        if (!data.image_url) fail(409, 'La bozza non contiene ancora un post da pubblicare.');
        Object.assign(data,{status:'pubblicato',publication_method:'manual',published_at:now(),editorial_at:data.editorial_at || now()});
        delete data.scheduled_at; delete data.social_page_id; delete data.schedule_error;
      } else fail(405,'Operazione non consentita.');
      const changed=(await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(data),now(),id,row.data)).changes;
      if (!changed) fail(409,'Il post è cambiato. Aggiorna il calendario e riprova.');
      return postRecord((await getPost(id,user)));
    }
    if (path === '/api/auth/register' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'register',15);
      if ((await db.prepare('SELECT id FROM users WHERE email=?').get(email))) fail(409,'Questo indirizzo e gia registrato. Accedi oppure recupera la password.');
      const password = await hashPassword(body.password);
      if (!(await db.prepare(SQL.register).run(uid(),email,password,now())).changes) fail(409,'Questo indirizzo è già registrato.');
      await verificationMail(email);
      return { verification_required:true };
    }
    if (path === '/api/auth/verify' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'verify');
      (await verifyChallenge(email,'verify',body.otpCode)); const user = (await verifyUser(email)); return signInResult(req,res,user);
    }
    if (path === '/api/auth/resend' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'resend',10);
      const user = (await db.prepare('SELECT * FROM users WHERE email=?').get(email));
      if (user && !user.verified) await verificationMail(email);
      return { ok:true };
    }
    if (path === '/api/auth/login' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'login');
      const user = (await db.prepare('SELECT * FROM users WHERE email=?').get(email));
      if (!user || !(await checkPassword(body.password,user.password))) fail(401,'Email o password non corrette.');
      if (!user.verified) fail(403,'Verifica la tua email prima di accedere.','email_unverified');
      return signInResult(req,res,user);
    }
    if (path === '/api/auth/logout' && method === 'POST') {
      (await db.prepare('DELETE FROM sessions WHERE hash=?').run(digest(config,sessionToken(req)))); setCookie(res,'clicksocial_session','',0); return { ok:true };
    }
    if (path === '/api/auth/reset-request' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'reset',10);
      const user = (await db.prepare('SELECT * FROM users WHERE email=?').get(email));
      if (user?.verified) {
        const token = (await challenge(email,'reset'));
        await integrations.sendMail(email,'Reimposta la password ClickSocial', 'Apri questo link entro 30 minuti:\n' + config.origin + '/reset-password?token=' + token + '&email=' + encodeURIComponent(email));
      }
      return { ok:true };
    }
    if (path === '/api/auth/reset' && method === 'POST') {
      const body = await bodyJson(req); const email = emailValue(body.email); rateLimit(req,'reset-submit');
      const password = await hashPassword(body.newPassword);
      (await verifyChallenge(email,'reset',body.resetToken));
      (await transaction(db, async () => {
        (await db.prepare('UPDATE users SET password=? WHERE email=?').run(password,email));
        (await db.prepare('DELETE FROM sessions WHERE user_id=(SELECT id FROM users WHERE email=?)').run(email));
      }));
      setCookie(res,'clicksocial_session','',0); return { ok:true };
    }
    if (path === '/api/auth/me' && method === 'PATCH') {
      const user = (await requiredUser(req)); const body = await bodyJson(req);
      if (Object.keys(body).some(k => !profileFields.includes(k))) fail(403,'Puoi modificare solo i dati del profilo aziendale.');
      const profile = JSON.parse(user.profile);
      for (const [key,value] of Object.entries(body)) {
        if (key === 'brand_settings') { profile[key] = await validateBrand(db, config, user, value); continue; }
        if (key === 'preferred_template') { try { profile[key] = getTemplate(value).id; } catch (e) { fail(400, e.message); } continue; }
        if (key === 'setup_completed') { if (typeof value !== 'boolean') fail(400,'Stato configurazione non valido.'); profile[key]=value; continue; }
        if (typeof value !== 'string' || value.length > 5000) fail(400,'Campo profilo non valido.');
        if (key === 'company_logo_url' && value) (await ownedImage(db,config,user,value));
        profile[key] = value;
      }
      const changed = await db.prepare('UPDATE users SET profile=? WHERE id=? AND profile=?').run(JSON.stringify(profile),user.id,user.profile);
      if (!changed.changes) fail(409,'Il profilo è cambiato. Aggiorna e riprova.');
      return safeUser((await db.prepare('SELECT * FROM users WHERE id=?').get(user.id)));
    }
    if (path === '/api/fonts' && method === 'POST') {
      const user = await requiredUser(req); rateLimit(req, 'upload', 100, user);
      return saveFont(db, config, user, await bodyBuffer(req, 5 * 1024 * 1024), req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'carattere');
    }
    if (path === '/api/files' && method === 'POST') {
      const user = (await requiredUser(req)); rateLimit(req,'upload',100,user);
      return (await saveImage(db,config,user,await bodyBuffer(req,15*1024*1024), req.headers['x-file-name'] ? decodeURIComponent(req.headers['x-file-name']) : 'immagine'));
    }
    if (/^\/api\/files\/[a-f0-9-]{36}$/.test(path) && method === 'GET') {
      const image = (await ownedFile(db,config,(await requiredUser(req)),path));
      res.writeHead(200, { 'Content-Type':image.mime, 'Cache-Control':'private, no-store', 'Content-Length':image.bytes.length }); res.end(image.bytes); return;
    }
    const entity = path.match(/^\/api\/entities\/(Post|User|AiLog)(?:\/([a-f0-9-]{36}))?$/);
    if (entity) {
      const user = (await requiredUser(req)); const [,name,id] = entity;
      if (name === 'Post') {
        if (method === 'GET' && id) return postRecord((await getPost(id,user)));
        if (method === 'GET') {
          const limit = Math.floor(Math.min(10000,Math.max(1,Number(url.searchParams.get('limit')) || 10000)));
          const rows = (await db.prepare('SELECT * FROM posts WHERE user_id=? ORDER BY created_at DESC LIMIT ?').all(user.id,limit));
          return rows.map(postRecord);
        }
        if (method === 'POST' && !id) {
          const data = (await validatePost(await bodyJson(req),user)); const postId=uid(); const created=now();
          (await db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(postId,user.id,JSON.stringify(data),created,created));
          return postRecord((await getPost(postId,user)));
        }
        if (method === 'PATCH' && id) {
          const row = (await getPost(id,user)); const previous=JSON.parse(row.data);
          editablePost(previous);
          const data=(await validatePost(await bodyJson(req),user,previous));
          if (previous.status === 'fallito') { delete data.scheduled_at; delete data.social_page_id; delete data.schedule_error; }
          if (!(await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(data),now(),id,row.data)).changes) fail(409,'Il post è cambiato. Aggiorna e riprova.');
          return postRecord((await getPost(id,user)));
        }
        if (method === 'DELETE' && id) {
          const row = await getPost(id,user);
          if (['in_coda','in_pubblicazione','da_verificare'].includes(JSON.parse(row.data).status)) fail(409,'Annulla prima l’invio automatico o verifica il suo esito.');
          if (!(await db.prepare('DELETE FROM posts WHERE id=? AND data=?').run(id,row.data)).changes) fail(409,'Il post è cambiato. Aggiorna e riprova.');
          return { ok:true };
        }
      }
      if (name === 'User') {
        admin(user);
        if (method === 'GET') return (await db.prepare('SELECT * FROM users WHERE verified=1 ORDER BY created_at DESC').all()).map(safeUser);
        if (method === 'PATCH' && id) {
          const body=await bodyJson(req);
          if (Object.keys(body).some(k => k !== 'plan') || !['free','pro'].includes(body.plan)) fail(400,'Piano non valido.');
          if (!(await db.prepare('UPDATE users SET plan=? WHERE id=?').run(body.plan,id)).changes) fail(404,'Utente non trovato.');
          return safeUser((await db.prepare('SELECT * FROM users WHERE id=?').get(id)));
        }
      }
      if (name === 'AiLog') {
        admin(user);
        if (method === 'GET') return (await db.prepare('SELECT * FROM ai_logs ORDER BY created_at DESC, id DESC LIMIT 500').all()).map(row => withAiCosts({...JSON.parse(row.data),id:row.id,created_date:row.created_at}));
      }
      fail(405,'Operazione non consentita.');
    }
    if (path === '/api/social/disconnect' && method === 'POST') {
      return social.disconnect(await requiredUser(req), 'facebook');
    }
    const oauthStart=path.match(/^\/api\/oauth\/(google|facebook)\/start$/);
    if (oauthStart && method === 'POST') {
      const body=await bodyJson(req); const provider=oauthStart[1];
      const auth=(await integrations.beginOAuth(provider,provider==='facebook' ? (await requiredUser(req)) : (await currentUser(req)),String(body.returnTo || '/')));
      setCookie(res,'clicksocial_oauth',auth.state,600); return { url:auth.url };
    }
    const oauthCallback=path.match(/^\/api\/oauth\/(google|facebook)\/callback$/);
    if (oauthCallback && method === 'GET') {
      if (url.searchParams.has('error')) fail(400,'Collegamento annullato o non autorizzato.');
      const result=await integrations.finishOAuth(oauthCallback[1],url.searchParams.get('state'),url.searchParams.get('code'),cookie(req,'clicksocial_oauth'),(await currentUser(req))?.id);
      setCookie(res,'clicksocial_oauth','',0);
      if (result.provider==='google') {
        await transaction(db, async () => {
        const identity=(await db.prepare('SELECT user_id FROM oauth_identities WHERE provider=? AND subject=?').get('google',result.subject));
        let user=identity ? (await db.prepare('SELECT * FROM users WHERE id=?').get(identity.user_id)) : (await db.prepare('SELECT * FROM users WHERE email=?').get(result.email));
        if (!identity && user && (result.requestUserId!==user.id || (await currentUser(req))?.id!==user.id)) fail(409,'Esiste gia un account con questa email. Accedi con la password e collega Google dal Profilo.');
        if (!user) { const id=uid(); (await db.prepare('INSERT INTO users(id,email,created_at) VALUES (?,?,?)').run(id,result.email,now())); user=(await db.prepare('SELECT * FROM users WHERE id=?').get(id)); }
        if (!identity) (await db.prepare('INSERT INTO oauth_identities VALUES (?,?,?)').run('google',result.subject,user.id));
        if (!user.verified) user=await markVerified(user.email);
        (await session(res,user.id));
        });
      }
      res.writeHead(302,{Location:result.returnTo}); res.end(); return;
    }
    const fn=path.match(/^\/api\/functions\/([A-Za-z]+)$/);
    if (fn && method==='POST') {
      const user=(await requiredUser(req)); const body=await bodyJson(req);
      if (fn[1]==='generateCopy') { rateLimit(req,'ai',60,user); return integrations.generateCopy(user,body); }
      if (fn[1]==='aiStatus') { admin(user); return integrations.aiStatus(user); }
      if (fn[1]==='createCheckout') { rateLimit(req,'checkout',10,user); return integrations.createCheckout(user); }
      if (fn[1]==='socialStatus') return integrations.socialStatus(user);
      if (fn[1]==='schedulePost') return schedulePost(user,body);
      if (fn[1]==='deleteUserAccount') {
        if ((await db.prepare(`SELECT id FROM posts WHERE user_id=? AND ${db.json('status')}='in_pubblicazione'`).get(user.id))) fail(409,'Attendi il completamento della pubblicazione prima di eliminare il profilo.');
        await integrations.cancelSubscription(user);
        const files = await transaction(db, async () => {
          if (await db.prepare(`SELECT id FROM posts WHERE user_id=? AND ${db.json('status')}='in_pubblicazione'`).get(user.id)) fail(409,'Attendi il completamento della pubblicazione prima di eliminare il profilo.');
          const rows = await db.prepare('SELECT id FROM files WHERE user_id=?').all(user.id);
          await db.prepare('DELETE FROM mail WHERE recipient=?').run(user.email);
          await db.prepare('DELETE FROM challenges WHERE email=?').run(user.email);
          await db.prepare('DELETE FROM users WHERE id=?').run(user.id);
          return rows;
        });
        for (const file of files) { if (/^[a-f0-9-]{36}$/.test(file.id)) try { unlinkSync(join(config.dataDir,'uploads',file.id)); } catch { /* File already absent. */ } }
        setCookie(res,'clicksocial_session','',0); return { success:true };
      }
      fail(404,'Funzione non disponibile.');
    }
    if (path==='/dev/mail' && method==='GET' && config.localMode && !config.smtpHost) {
      const messages=(await db.prepare('SELECT * FROM mail ORDER BY created_at DESC LIMIT 30').all());
      const html='<!doctype html><html lang="it"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Posta locale ClickSocial</title><style>body{font:16px/1.6 system-ui;max-width:760px;margin:40px auto;padding:0 20px;color:#242424}article{border-top:1px solid #ccc;padding:20px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere}a{color:#5430a2}</style><h1>Posta locale ClickSocial</h1><p>Questi messaggi restano sul computer. Nessuna email e stata inviata.</p><p><a href="/dev/mail">Aggiorna</a> | <a href="/login">Accedi a ClickSocial</a></p>'+messages.map(renderLocalMail).join('')+'</html>';
      res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}); res.end(html); return;
    }
    if (path.startsWith('/api/') || path.startsWith('/dev/')) fail(404,'Risorsa non trovata.');
    if (method!=='GET' && method!=='HEAD') fail(405,'Metodo non consentito.');
    const dist=join(config.root,'dist');
    let target=resolve(dist,'.'+decodeURIComponent(path));
    if (!target.startsWith(dist+sep)) target=join(dist,'index.html');
    if (!existsSync(target) || !statSync(target).isFile()) target=join(dist,'index.html');
    if (!existsSync(target)) fail(503,'Avvia npm run dev oppure esegui prima npm run build.');
    const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf','.otf':'font/otf','.ico':'image/x-icon'};
    res.writeHead(200,{'Content-Type':mime[extname(target)] || 'application/octet-stream','Cache-Control':path.startsWith('/assets/') && extname(target) !== '.html' ? 'public, max-age=86400' : 'no-cache'}); res.end(method==='HEAD' ? undefined : readFileSync(target));
  }
  const server=createServer(async (req,res) => {
    res.setHeader('X-Content-Type-Options','nosniff'); res.setHeader('Referrer-Policy','same-origin'); res.setHeader('Cache-Control','no-store');
    res.setHeader('Permissions-Policy','camera=(self), microphone=()');
    res.setHeader('Content-Security-Policy',"frame-ancestors 'self'; base-uri 'self'; object-src 'none'");
    try {
      const host=req.headers.host || '';
      const validHosts=[new URL(config.origin).host,'localhost:'+config.port,'127.0.0.1:'+config.port];
      if (config.localMode && !validHosts.includes(host) && !(config.port===0 && /^(localhost|127\.0\.0\.1):\d+$/.test(host))) fail(403,'Host non autorizzato.');
      const url=new URL(req.url,config.origin);
      if (mobileRequestPolicy(req, res, config, url.pathname)) return;
      const result=await route(req,res,url);
      if (!res.writableEnded) { res.writeHead(200,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify(result ?? {})); }
    } catch(error) {
      if (!res.writableEnded) { const status=error instanceof URIError ? 400 : error.status || 500; res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'}); res.end(JSON.stringify({error:status===500 ? 'Errore interno. Consulta il registro del server.' : error instanceof URIError ? 'Indirizzo o nome file non valido.' : error.message,code:error.code})); }
      if (!error.status && !(error instanceof URIError)) console.error('Request failed:',error.message);
    }
  });
  server.requestTimeout=150000;
  const timer=config.scheduler===false ? null : setInterval(()=>integrations.publishDuePosts().catch(e=>console.error('Scheduler:',e.message)),30000);
  timer?.unref();
  return {server,db,config,integrations, async close() { if(timer) clearInterval(timer); if(server.listening) await new Promise(resolve=>server.close(resolve)); try { await integrations.publication.waitForIdle(); } finally { await db.close(); } }};
}
