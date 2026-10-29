import { randomBytes } from 'node:crypto';
import { SQL } from './sql.mjs';
import { decrypt, digest, encrypt, fail, now, transaction } from './store.mjs';

export const SOCIAL_NAMES = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' };
const token = () => randomBytes(32).toString('hex');
const scopes = {
  facebook: ['pages_show_list', 'pages_read_engagement', 'pages_manage_posts'],
  instagram: ['instagram_business_basic', 'instagram_business_content_publish'],
  tiktok: ['user.info.basic', 'video.publish'],
};
export function socialProvider(value) {
  if (!Object.hasOwn(SOCIAL_NAMES, value)) fail(400, 'Social non riconosciuto.');
  return value;
}
export async function readConnections(db, config, userId) {
  const row = await db.prepare('SELECT encrypted FROM social_connections WHERE user_id=?').get(userId);
  if (!row) return {};
  const stored = decrypt(config, row.encrypted);
  // Compatibilità con i collegamenti Facebook già presenti, senza migrare dati o chiavi.
  return stored.version === 2 ? stored.providers : { facebook: stored };
}
export async function writeConnection(db, config, userId, provider, value) {
  const write = async () => {
    const providers = await readConnections(db, config, userId);
    if (value) providers[provider] = value;
    else delete providers[provider];
    if (Object.keys(providers).length) await db.prepare(SQL.socialConnection).run(userId, encrypt(config, { version: 2, providers }));
    else await db.prepare('DELETE FROM social_connections WHERE user_id=?').run(userId);
  };
  return db.current() ? write() : transaction(db, write);
}
export function socialRequest(fetchImpl = fetch) {
  return async function call(url, options = {}) {
    let response, data;
    try {
      response = await fetchImpl(url, { ...options, redirect: 'error', signal: AbortSignal.timeout(25000) });
      data = await response.json();
    } catch {
      throw Object.assign(new Error('Il social non risponde. Riprova tra poco.'), { status: 502, transient: true });
    }
    const code = data?.error?.code;
    if (!response.ok || (data?.error && code !== 'ok') || !data) {
      const auth = response.status === 401 || [190, 102, 'access_token_invalid', 'invalid_grant'].includes(code);
      const permission = response.status === 403 || [10, 200, 'scope_not_authorized', 'scope_not_authorized_for_user'].includes(code);
      const messages = {
        url_ownership_unverified: 'Il gestore deve verificare il dominio delle immagini su TikTok.',
        unaudited_client_can_only_post_to_private_accounts: 'TikTok consente solo test privati finché non approva l’app della società.',
        privacy_level_option_mismatch: 'La visibilità consentita da TikTok è cambiata. Riapri la finestra di pubblicazione.',
        spam_risk_too_many_posts: 'TikTok ha raggiunto il limite di pubblicazioni. Riprova più tardi.',
      };
      throw Object.assign(new Error(messages[code] || (auth ? 'Autorizzazione scaduta o revocata. Ricollega questo social.' : permission ? 'Il social non concede i permessi necessari. Ricollegalo e autorizza la pubblicazione.' : 'Il social ha rifiutato la richiesta. Controlla account, formato e limiti, poi riprova.')), {
        status: auth || permission ? 409 : 502, code: auth ? 'social_reconnect' : permission ? 'social_permissions' : 'social_rejected',
        transient: response.status >= 500 || response.status === 429,
      });
    }
    return data;
  };
}
const bearer = accessToken => ({ Authorization: 'Bearer ' + accessToken });
export const jsonBody = value => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(value) });

export function createSocialConnections(db, config, fetchImpl = fetch) {
  const call = socialRequest(fetchImpl);
  const graph = () => 'https://graph.facebook.com/' + config.metaVersion;
  const instagram = () => 'https://graph.instagram.com/' + config.metaVersion;
  const callback = provider => config.origin + '/api/social/' + provider + '/callback';
  const configured = provider => ({ facebook: config.metaId && config.metaSecret, instagram: config.instagramId && config.instagramSecret, tiktok: config.tiktokKey && config.tiktokSecret })[provider];
  function requireConfig(provider) {
    socialProvider(provider);
    if (!configured(provider)) fail(503, SOCIAL_NAMES[provider] + ' deve essere attivato dal gestore di ClickSocial.', 'integration_unconfigured');
    if (new URL(config.origin).protocol !== 'https:') fail(503, 'Per collegare i social serve l’indirizzo HTTPS pubblico di ClickSocial. Il gestore deve configurarlo sul server.', 'social_https_required');
  }
  async function facebookPages(accessToken) {
    const permissions = await call(graph() + '/me/permissions', { headers: bearer(accessToken) });
    if (!scopes.facebook.every(scope => permissions.data?.some(item => item.permission === scope && item.status === 'granted'))) fail(409, 'Autorizza l’accesso alle Pagine e la pubblicazione su Facebook.', 'social_permissions');
    const pages = [];
    let after;
    for (let i = 0; i < 10; i++) {
      const output = await call(graph() + '/me/accounts?' + new URLSearchParams({ fields: 'id,name,access_token,tasks', limit: '100', ...(after ? { after } : {}) }), { headers: bearer(accessToken) });
      pages.push(...(output.data || []).filter(page => page.access_token && (!page.tasks || page.tasks.some(task => ['CREATE_CONTENT', 'MANAGE', 'PROFILE_PLUS_CREATE_CONTENT', 'PROFILE_PLUS_FULL_CONTROL'].includes(task)))));
      if (!output.paging?.next) break;
      after = output.paging.cursors?.after;
      if (!after) break;
    }
    return pages;
  }
  const safeAccounts = (provider, connection) => provider === 'facebook'
    ? (connection.pages || []).map(page => ({ id: String(page.id), name: page.name }))
    : [{ id: String(connection.account.id), name: connection.account.name }];
  async function exchange(provider, code) {
    if (!code || code.length > 4096) fail(400, 'Il social non ha restituito il codice di autorizzazione.');
    if (provider === 'facebook') {
      const short = await call(graph() + '/oauth/access_token?' + new URLSearchParams({ client_id: config.metaId, client_secret: config.metaSecret, redirect_uri: callback(provider), code }));
      const long = await call(graph() + '/oauth/access_token?' + new URLSearchParams({ grant_type: 'fb_exchange_token', client_id: config.metaId, client_secret: config.metaSecret, fb_exchange_token: short.access_token }));
      const pages = await facebookPages(long.access_token);
      if (!pages.length) fail(409, 'Nessuna Pagina pubblicabile. Accedi con chi gestisce la Pagina e concedi l’accesso a ClickSocial. I profili personali Facebook non sono supportati.');
      return { accessToken: long.access_token, pages };
    }
    if (provider === 'instagram') {
      const short = await call('https://api.instagram.com/oauth/access_token', { method: 'POST', body: new URLSearchParams({ client_id: config.instagramId, client_secret: config.instagramSecret, grant_type: 'authorization_code', redirect_uri: callback(provider), code }) });
      const long = await call('https://graph.instagram.com/access_token?' + new URLSearchParams({ grant_type: 'ig_exchange_token', client_secret: config.instagramSecret, access_token: short.access_token }));
      const profile = await call(instagram() + '/me?fields=user_id,username,account_type', { headers: bearer(long.access_token) });
      if (!['BUSINESS', 'MEDIA_CREATOR', 'CREATOR'].includes(profile.account_type)) fail(409, 'Collega un account Instagram professionale, Business o Creator.');
      const permissions = await call(instagram() + '/me/permissions', { headers: bearer(long.access_token) });
      if (!scopes.instagram.every(scope => permissions.data?.some(item => item.permission === scope && item.status === 'granted'))) fail(409, 'Consenti anche la pubblicazione dei contenuti Instagram.', 'social_permissions');
      return { accessToken: long.access_token, expiresAt: Date.now() + long.expires_in * 1000, refreshedAt: Date.now(), account: { id: String(profile.user_id || profile.id), name: '@' + profile.username } };
    }
    const auth = await call('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', body: new URLSearchParams({ client_key: config.tiktokKey, client_secret: config.tiktokSecret, grant_type: 'authorization_code', redirect_uri: callback(provider), code }) });
    if (!scopes.tiktok.every(scope => String(auth.scope || '').split(',').includes(scope))) fail(409, 'Consenti l’accesso al profilo e la pubblicazione su TikTok.', 'social_permissions');
    const profile = await call('https://open.tiktokapis.com/v2/user/info/?fields=open_id,display_name', { headers: bearer(auth.access_token) });
    if (!profile.data?.user?.open_id || profile.data.user.open_id !== auth.open_id) fail(502, 'TikTok non ha confermato l’account. Riprova.');
    return { accessToken: auth.access_token, refreshToken: auth.refresh_token, expiresAt: Date.now() + auth.expires_in * 1000, account: { id: auth.open_id, name: profile.data.user.display_name } };
  }
  async function flowRow(id) {
    if (!/^[a-f0-9]{64}$/.test(id || '')) fail(400, 'Collegamento non valido.');
    const row = await db.prepare('SELECT * FROM oauth_states WHERE hash=? AND expires>?').get(digest(config, id), Date.now());
    if (!row || !row.provider.startsWith('social:')) fail(410, 'Collegamento scaduto. Premi di nuovo Collega.');
    return { row, context: JSON.parse(row.data), provider: row.provider.slice(7) };
  }
  async function updateFlow(row, context, expires = row.expires) {
    if (!(await db.prepare('UPDATE oauth_states SET data=?,expires=? WHERE hash=? AND data=?').run(JSON.stringify(context), expires, row.hash, row.data)).changes) fail(409, 'Collegamento già utilizzato. Riapri il Profilo.');
  }
  async function begin(user, provider, native = false) {
    requireConfig(provider);
    const id = token(), ticket = token();
    await db.prepare('DELETE FROM oauth_states WHERE expires<=?').run(Date.now());
    await db.prepare('INSERT INTO oauth_states VALUES (?,?,?,?)').run(digest(config, id), 'social:' + provider, JSON.stringify({ userId: user.id, native, stage: 'start', ticket: digest(config, ticket) }), Date.now() + 15 * 60000);
    return { id, url: config.origin + '/api/social/authorize?id=' + id + '&ticket=' + ticket };
  }
  async function authorize(id, ticket) {
    const { row, context, provider } = await flowRow(id);
    if (context.stage !== 'start' || context.ticket !== digest(config, ticket || '')) fail(400, 'Questo collegamento è già stato aperto o non è valido. Riprova dall’app.');
    const browser = token();
    delete context.ticket;
    Object.assign(context, { stage: 'waiting', browser: digest(config, browser) });
    await updateFlow(row, context);
    const params = new URLSearchParams({ redirect_uri: callback(provider), response_type: 'code', state: id, scope: scopes[provider].join(',') });
    let base;
    if (provider === 'facebook') {
      base = 'https://www.facebook.com/' + config.metaVersion + '/dialog/oauth'; params.set('client_id', config.metaId);
      if (config.metaLoginConfigId) { params.set('config_id', config.metaLoginConfigId); params.delete('scope'); }
    } else if (provider === 'instagram') {
      base = 'https://www.instagram.com/oauth/authorize'; params.set('client_id', config.instagramId); params.set('enable_fb_login', '0'); params.set('force_authentication', '1');
    } else { base = 'https://www.tiktok.com/v2/auth/authorize/'; params.set('client_key', config.tiktokKey); params.set('disable_auto_auth', '1'); }
    return { browser, url: base + '?' + params };
  }
  async function complete(provider, id, browser, code, denied) {
    const { row, context, provider: expected } = await flowRow(id);
    if (provider !== expected || context.stage !== 'waiting' || !browser || context.browser !== digest(config, browser)) fail(400, 'La sessione di collegamento non corrisponde. Riprova dall’app.');
    context.stage = 'exchanging'; delete context.browser;
    await updateFlow(row, context);
    const processing = JSON.stringify(context);
    try {
      if (denied) fail(400, 'Autorizzazione annullata. Il collegamento precedente non è stato modificato.');
      context.candidate = encrypt(config, await exchange(provider, code));
      context.stage = 'choose';
    } catch (error) { context.stage = 'error'; context.message = error.status ? error.message : 'Collegamento non completato. Riprova dal Profilo.'; }
    // Non resuscitare un tentativo annullato mentre il provider rispondeva.
    const saved = await db.prepare('UPDATE oauth_states SET data=? WHERE hash=? AND data=?').run(JSON.stringify(context), row.hash, processing);
    if (!saved.changes) return { native: context.native, id, message: 'Questo tentativo di collegamento è già stato chiuso. Torna a ClickSocial per controllare lo stato.' };
    return { native: context.native, id, message: context.stage === 'choose' ? 'Autorizzazione ricevuta. Torna in ClickSocial per scegliere e confermare l’account.' : context.message };
  }
  async function flow(user, id) {
    const { context, provider } = await flowRow(id);
    if (context.userId !== user.id) fail(404, 'Collegamento non trovato.');
    return { id, provider, stage: context.stage, message: context.message, accounts: context.stage === 'choose' ? safeAccounts(provider, decrypt(config, context.candidate)) : [] };
  }
  async function confirm(user, id, ids) {
    return transaction(db, async () => {
      const { row, context, provider } = await flowRow(id);
      if (context.userId !== user.id) fail(404, 'Collegamento non trovato.');
      if (['completed', 'cancelled'].includes(context.stage)) fail(410, 'Questo tentativo di collegamento è già stato chiuso.');
      if (context.stage !== 'choose' || !Array.isArray(ids) || !ids.length) fail(400, 'Scegli almeno un account da collegare.');
      const connection = decrypt(config, context.candidate), accounts = safeAccounts(provider, connection);
      if (ids.some(id => !accounts.some(account => account.id === id))) fail(400, 'Account non autorizzato.');
      const posts = await db.prepare('SELECT data FROM posts WHERE user_id=?').all(user.id);
      const pending = posts.map(row => JSON.parse(row.data)).filter(post => post.platform === provider && ['in_pubblicazione', 'da_verificare'].includes(post.status));
      if (pending.some(post => !ids.includes(post.social_job?.account_id || post.social_page_id))) fail(409, 'Un invio è in corso o da verificare. Puoi rinnovare il collegamento allo stesso account; prima di cambiarlo risolvi l’esito in Libreria.');
      if (provider === 'facebook') connection.pages = connection.pages.filter(page => ids.includes(String(page.id)));
      connection.connectedAt = now();
      await writeConnection(db, config, user.id, provider, connection);
      // Le altre finestre possono leggere l'esito, senza conservare credenziali né consentire un secondo consenso.
      await updateFlow(row, { userId: user.id, stage: 'completed' }, Date.now() + 15 * 60000);
      return { ok: true };
    });
  }
  async function cancel(user, id) {
    return transaction(db, async () => {
      const { row, context } = await flowRow(id);
      if (context.userId !== user.id) fail(404, 'Collegamento non trovato.');
      if (['completed', 'cancelled'].includes(context.stage)) return { ok: true, stage: context.stage };
      await updateFlow(row, { userId: user.id, stage: 'cancelled' }, Date.now() + 15 * 60000);
      return { ok: true, stage: 'cancelled' };
    });
  }
  const refreshing = new Map();
  async function connection(user, provider) {
    const current = (await readConnections(db, config, user.id))[provider];
    if (!current) fail(409, 'Collega ' + SOCIAL_NAMES[provider] + ' dal Profilo.', 'social_reconnect');
    const needsRefresh = provider === 'tiktok' && current.expiresAt < Date.now() + 300000 || provider === 'instagram' && current.expiresAt < Date.now() + 7 * 86400000 && current.refreshedAt < Date.now() - 86400000;
    if (!needsRefresh) return current;
    const key = user.id + ':' + provider;
    if (refreshing.has(key)) return refreshing.get(key);
    const promise = (async () => {
      const lease = { id: token(), until: Date.now() + 45000 };
      let claimed = false, newer;
      await transaction(db, async () => {
        const latest = (await readConnections(db, config, user.id))[provider];
        if (!latest) fail(409, 'Il collegamento è stato rimosso.', 'social_reconnect');
        if (latest.accessToken !== current.accessToken) { newer = latest; return; }
        if (latest.refreshLease?.until > Date.now()) throw Object.assign(new Error('Rinnovo dell’autorizzazione in corso. Riprova tra poco.'), { status: 503, transient: true });
        await writeConnection(db, config, user.id, provider, { ...latest, refreshLease: lease });
        claimed = true;
      });
      if (!claimed) return newer;
      try {
      const auth = provider === 'tiktok'
        ? await call('https://open.tiktokapis.com/v2/oauth/token/', { method: 'POST', body: new URLSearchParams({ client_key: config.tiktokKey, client_secret: config.tiktokSecret, grant_type: 'refresh_token', refresh_token: current.refreshToken }) })
        : await call('https://graph.instagram.com/refresh_access_token?' + new URLSearchParams({ grant_type: 'ig_refresh_token', access_token: current.accessToken }));
      if (!auth.access_token || !Number.isFinite(auth.expires_in)) fail(502, 'Il social non ha rinnovato l’autorizzazione. Ricollegalo dal Profilo.');
      const refreshed = { ...current, accessToken: auth.access_token, refreshToken: auth.refresh_token || current.refreshToken, expiresAt: Date.now() + auth.expires_in * 1000, refreshedAt: Date.now() };
      delete refreshed.refreshLease;
      await transaction(db, async () => {
        const latest = (await readConnections(db, config, user.id))[provider];
        if (!latest || latest.accessToken !== current.accessToken || latest.refreshLease?.id !== lease.id) fail(409, 'Il collegamento è cambiato. Riapri il Profilo.');
        await writeConnection(db, config, user.id, provider, refreshed);
      });
      return refreshed;
      } finally {
        await transaction(db, async () => {
          const latest = (await readConnections(db, config, user.id))[provider];
          if (latest?.refreshLease?.id === lease.id) {
            delete latest.refreshLease;
            await writeConnection(db, config, user.id, provider, latest);
          }
        });
      }
    })().finally(() => refreshing.delete(key));
    refreshing.set(key, promise);
    return promise;
  }
  async function verify(user, provider) {
    const saved = await connection(user, provider);
    if (provider === 'facebook') {
      const pages = await facebookPages(saved.accessToken);
      const selected = pages.filter(page => saved.pages.some(old => String(old.id) === String(page.id)));
      if (!selected.length) fail(409, 'Le Pagine selezionate non sono più accessibili. Ricollega Facebook.', 'social_permissions');
      return { connection: { ...saved, pages: selected }, accounts: safeAccounts(provider, { pages: selected }) };
    }
    if (provider === 'instagram') {
      const profile = await call(instagram() + '/me?fields=user_id,username,account_type', { headers: bearer(saved.accessToken) });
      const permissions = await call(instagram() + '/me/permissions', { headers: bearer(saved.accessToken) });
      if (String(profile.user_id || profile.id) !== saved.account.id || !scopes.instagram.every(scope => permissions.data?.some(item => item.permission === scope && item.status === 'granted'))) fail(409, 'Account o permessi Instagram cambiati. Ricollega Instagram.', 'social_permissions');
      return { connection: saved, accounts: [{ id: saved.account.id, name: '@' + profile.username }] };
    }
    const creator = await call('https://open.tiktokapis.com/v2/post/publish/creator_info/query/', { method: 'POST', headers: { ...bearer(saved.accessToken), 'Content-Type': 'application/json' } });
    return { connection: saved, accounts: [{ id: saved.account.id, name: creator.data.creator_nickname || saved.account.name }], creator: creator.data };
  }
  async function status(user, live = false) {
    const saved = await readConnections(db, config, user.id), output = {};
    await Promise.all(Object.keys(SOCIAL_NAMES).map(async provider => {
      let state = { configured: !!configured(provider), connected: !!saved[provider], state: saved[provider] ? 'saved' : 'disconnected', accounts: saved[provider] ? safeAccounts(provider, saved[provider]) : [] };
      if (live && saved[provider]) {
        try { const checked = await verify(user, provider); state = { ...state, state: 'ready', accounts: checked.accounts }; }
        catch (error) { state.state = error.code === 'social_reconnect' ? 'reconnect' : error.code === 'social_permissions' ? 'permissions' : 'unavailable'; state.message = error.status ? error.message : 'Verifica temporaneamente non disponibile.'; }
      }
      if (provider === 'facebook') state.pages = state.accounts;
      output[provider] = state;
    }));
    return output;
  }
  async function disconnect(user, provider) {
    socialProvider(provider);
    return transaction(db, async () => {
      const posts = await db.prepare('SELECT * FROM posts WHERE user_id=?').all(user.id);
      if (posts.some(row => { const p = JSON.parse(row.data); return p.platform === provider && ['in_pubblicazione', 'da_verificare'].includes(p.status); })) fail(409, 'Attendi l’esito degli invii in corso o verifica quelli con esito incerto prima di scollegare.');
      await writeConnection(db, config, user.id, provider, null);
      for (const row of posts) {
        const p = JSON.parse(row.data);
        if (p.platform !== provider || p.status !== 'in_coda') continue;
        p.status = 'pronto'; p.schedule_error = 'Invio annullato perché ' + SOCIAL_NAMES[provider] + ' è stato scollegato.';
        delete p.scheduled_at; delete p.social_page_id; delete p.social_job;
        await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(p), now(), row.id, row.data);
      }
      return { ok: true };
    });
  }
  return { begin, authorize, complete, flow, confirm, cancel, status, disconnect, verify, connection, requireConfig, call, graph, instagram };
}
