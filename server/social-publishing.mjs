import { randomUUID, timingSafeEqual } from 'node:crypto';
import { digest, fail, now, transaction } from './store.mjs';
import { ownedImage } from './files.mjs';
import { postChannels, validChannels } from '../shared/publish-channels.mjs';
import { jsonBody, socialAccounts, socialProvider, readConnections } from './social-connections.mjs';

function jpegSize(bytes) {
  if (bytes[0] !== 255 || bytes[1] !== 216) return null;
  let at = 2;
  while (at + 4 < bytes.length) {
    if (bytes[at++] !== 255) return null;
    while (bytes[at] === 255) at++;
    const marker = bytes[at++];
    if (marker === 217 || marker === 218) break;
    if (marker === 1 || marker >= 208 && marker <= 215) continue;
    const size = bytes.readUInt16BE(at);
    if (size < 2 || at + size > bytes.length) return null;
    if ([192, 193, 194].includes(marker) && size >= 8) return { width: bytes.readUInt16BE(at + 5), height: bytes.readUInt16BE(at + 3) };
    at += size;
  }
  return null;
}
export function validateSocialImage(file, provider) {
  if (provider === 'facebook') return;
  const size = jpegSize(file.bytes);
  if (file.mime !== 'image/jpeg' || !size || !size.width || !size.height || file.bytes.length > 8 * 1024 * 1024) fail(400, 'Prepara una foto JPEG valida, fino a 8 MB, dalla finestra di pubblicazione.');
  if (provider === 'instagram' && (size.width < 320 || size.width > 1440 || size.width / size.height < 0.8 || size.width / size.height > 1.91)) fail(400, 'Per il post foto Instagram usa un formato quadrato, 4:5 oppure 16:9. Modifica il formato nello Studio e salva.');
  if (size.width > 10800 || size.height > 10800) fail(400, 'La foto supera le dimensioni consentite.');
}
export function validateTikTokOptions(value, creator) {
  const options = value || {};
  if (!creator.privacy_level_options?.includes(options.privacy_level)) fail(409, 'Scegli una visibilità consentita dal tuo account TikTok.');
  for (const key of ['disable_comment', 'auto_add_music', 'brand_content_toggle', 'brand_organic_toggle', 'is_aigc', 'commercial_disclosure']) if (typeof options[key] !== 'boolean') fail(400, 'Completa le opzioni di pubblicazione TikTok.');
  if (options.commercial_disclosure !== (options.brand_content_toggle || options.brand_organic_toggle)) fail(400, 'Indica se promuovi il tuo marchio, un altro marchio o entrambi.');
  if (typeof options.title !== 'string' || options.title.length > 90) fail(400, 'Il titolo TikTok può contenere fino a 90 caratteri.');
  if (creator.comment_disabled && !options.disable_comment) fail(409, 'I commenti sono disabilitati su questo account TikTok. Aggiorna le opzioni.');
  if (options.brand_content_toggle && options.privacy_level === 'SELF_ONLY') fail(400, 'TikTok non consente contenuti per un partner commerciale con visibilità Solo io.');
  if (options.music_consent !== true) fail(400, 'Conferma le condizioni TikTok prima di inviare la foto.');
  return Object.fromEntries(['title', 'privacy_level', 'disable_comment', 'auto_add_music', 'brand_content_toggle', 'brand_organic_toggle', 'is_aigc', 'music_consent', 'commercial_disclosure'].map(key => [key, options[key]]));
}

export function createSocialPublishing(db, config, social) {
  async function postFor(user, id) {
    const row = await db.prepare('SELECT * FROM posts WHERE id=? AND user_id=?').get(id, user.id);
    if (!row) fail(404, 'Post non trovato.');
    return { row, data: JSON.parse(row.data) };
  }
  async function ownImage(user, url) {
    const file = await ownedImage(db, config, user, url);
    if (file.user_id !== user.id) fail(404, 'Immagine non trovata.');
    return file;
  }
  async function prepare(user, id, requestedPlatform = null) {
    if (user.plan !== 'pro') fail(402, 'L’invio automatico ai social è incluso nel piano Pro.', 'pro_required');
    const { data } = await postFor(user, id);
    if (!data.image_url) fail(409, 'Completa e salva prima il post nello Studio.');
    if (['in_pubblicazione', 'pubblicato', 'da_verificare'].includes(data.status)) fail(409, 'Questo post è già in invio, pubblicato o da verificare.');
    const platform = requestedPlatform || data.platform;
    if (requestedPlatform && !postChannels(data).includes(platform)) fail(400, 'Il canale non è selezionato per questo post.');
    social.requireConfig(platform);
    const verified = await social.verify(user, platform);
    return { accounts:verified.accounts, creator:verified.creator, platform };
  }

  async function enqueue(user, body) {
    if (body.confirmed !== true) fail(400, 'Conferma il contenuto e l’account prima di inviare.');
    const initial = await postFor(user, body.post_id);
    const dual = body.destinations !== undefined;
    if (dual && (typeof body.request_id !== 'string' || !/^[a-f0-9-]{36}$/.test(body.request_id))) fail(400, 'Conferma nuovamente le destinazioni.');
    const targets = dual ? body.destinations : [{ platform:initial.data.platform, account_id:body.account_id, image_url:body.image_url }];
    if (dual && (!Array.isArray(targets) || targets.length !== 2 || !validChannels(targets.map(target => target?.platform)))) fail(400,'Conferma entrambe le destinazioni selezionate.');
    const confirmation = dual && digest(config, JSON.stringify([body.caption, body.scheduled_at || null,
      [...targets].sort((a,b) => a.platform.localeCompare(b.platform)).map(item => [item.platform, item.account_id, item.image_url || null])]));
    const repeated = data => {
      if (!dual || data.publication_group !== body.post_id || data.publication_request !== body.request_id) return false;
      if (data.publication_confirmation !== confirmation) fail(409,'L’invio è già stato confermato con altre impostazioni. Controlla i post salvati.');
      return true;
    };
    if (repeated(initial.data)) return { ok:true, scheduled_at:initial.data.scheduled_at };
    if (dual) {
      const allowed = postChannels(initial.data);
      if (!allowed.includes(initial.data.platform) || !targets.every(target => allowed.includes(target.platform))) fail(400,'Conferma entrambe le destinazioni selezionate.');
      if (initial.data.publication_group || initial.data.status === 'in_coda') fail(409,'Questi invii hanno già una destinazione. Controlla i post salvati.');
    } else if (initial.data.publish_channels && (initial.data.publish_channels.length !== 1 || initial.data.publish_channels[0] !== initial.data.platform)) {
      fail(400,'Conferma i canali selezionati per questo post.');
    }
    const when = body.scheduled_at ? new Date(body.scheduled_at) : new Date();
    if (!Number.isFinite(when.getTime()) || body.scheduled_at && when.getTime() <= Date.now()) fail(400, 'Scegli una data futura valida.');
    const caption = body.caption;
    const jobs = [];
    for (const target of targets) {
      const checked = await prepare(user, initial.row.id, dual ? target.platform : null);
      const account = checked.accounts.find(item => item.id === target.account_id);
      if (!account) fail(400, 'Seleziona un account collegato e autorizzato.');
      const image = await ownImage(user, target.image_url || initial.data.image_url);
      validateSocialImage(image, checked.platform);
      if (typeof caption !== 'string' || caption.length > ({ instagram:2200, tiktok:4000, facebook:10000 })[checked.platform]) fail(400, 'Il testo supera il limite del social selezionato.');
      const options = checked.platform === 'tiktok' ? validateTikTokOptions(body.options, checked.creator) : {};
      if (checked.platform === 'tiktok' && initial.data.mode !== 'original' && !options.is_aigc) fail(400, 'Questa immagine usa l’AI: abilita l’etichetta TikTok per i contenuti AI.');
      jobs.push({ platform:checked.platform, job:{ version:1, attempt:randomUUID(), phase:'prepared', account_id:account.id, account_name:account.name, image_url:'/api/files/' + image.id, caption, options } });
    }
    /** Il primo invio usa la bozza esistente. Il secondo nasce nella stessa transazione e ha il proprio stato, anche in caso di riprova. */
    return transaction(db, async () => {
      const { row, data } = await postFor(user, body.post_id);
      if (repeated(data)) return { ok:true, scheduled_at:data.scheduled_at };
      if (row.data !== initial.row.data) fail(409, 'Il post è cambiato. Riapri la finestra di pubblicazione.');
      const connections = await readConnections(db, config, user.id);
      for (const { platform, job } of jobs) {
        if (!connections[platform]) fail(409, 'Il collegamento social è stato rimosso.');
        if (!socialAccounts(platform, connections[platform]).some(account => account.id === job.account_id)) fail(409, 'Il collegamento social è cambiato. Seleziona di nuovo l’account.');
        const delivery = { ...data, platform, social_job:job, status:'in_coda', scheduled_at:when.toISOString(), editorial_at:when.toISOString(), social_page_id:job.account_id, schedule_error:'' };
        if (dual) Object.assign(delivery, { publish_channels:[platform], publication_group:row.id, publication_request:body.request_id, publication_confirmation:confirmation });
        if (platform === data.platform) {
          const changed = await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(delivery), now(), row.id, row.data);
          if (!changed.changes) fail(409, 'Il post è cambiato. Riapri la finestra di pubblicazione.');
        } else {
          const time = now();
          await db.prepare('INSERT INTO posts (id,user_id,data,created_at,updated_at) VALUES (?,?,?,?,?)').run(randomUUID(), user.id, JSON.stringify(delivery), time, time);
        }
      }
      return { ok:true, scheduled_at:when.toISOString() };
    });
  }
  function mediaUrl(postId, job, userId) {
    const expires = Date.now() + 2 * 3600000;
    const value = [postId, userId, job.attempt, job.image_url, expires].join(':');
    return config.origin + '/api/social/media/' + postId + '?expires=' + expires + '&signature=' + digest(config, value);
  }
  async function media(id, expires, signature) {
    if (!/^\d{13}$/.test(expires || '') || Number(expires) < Date.now() || Number(expires) > Date.now() + 2 * 3600000 || !/^[a-f0-9]{64}$/.test(signature || '')) fail(404, 'Immagine non disponibile.');
    const row = await db.prepare('SELECT * FROM posts WHERE id=?').get(id);
    if (!row) fail(404, 'Immagine non disponibile.');
    const data = JSON.parse(row.data), job = data.social_job;
    if (!job || !['in_pubblicazione', 'da_verificare', 'pubblicato'].includes(data.status)) fail(404, 'Immagine non disponibile.');
    const expected = digest(config, [id, row.user_id, job.attempt, job.image_url, expires].join(':'));
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) fail(404, 'Immagine non disponibile.');
    return ownImage({ id: row.user_id }, job.image_url);
  }
  async function resolve(user, id, body) {
    if (body.checked !== true || !['published', 'not_published'].includes(body.outcome)) fail(400, 'Controlla il profilo sul social e conferma l’esito.');
    const { row, data } = await postFor(user, id);
    if (data.status !== 'da_verificare') fail(409, 'Il post non richiede una verifica manuale.');
    data.status = body.outcome === 'published' ? 'pubblicato' : 'pronto';
    data.schedule_error = '';
    if (body.outcome === 'published') { data.publication_method = 'manual'; data.published_at = now(); }
    delete data.social_job; delete data.scheduled_at; delete data.social_page_id;
    if (!(await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(JSON.stringify(data), now(), id, row.data)).changes) fail(409, 'L’esito è cambiato. Aggiorna la Libreria.');
    return { ok: true };
  }
  let currentRun;
  function publishDuePosts() {
    if (!currentRun) currentRun = runDuePosts().finally(() => { currentRun = null; });
    return currentRun;
  }
  async function runDuePosts() {
      const lease = `CAST(json_extract(data,'$.social_job.leaseUntil') AS ${db.kind === 'mysql' ? 'UNSIGNED' : 'INTEGER'})`;
      const rows = await db.prepare(`SELECT * FROM posts WHERE (${db.json('status')}='in_coda' AND ${db.json('scheduled_at')}<=?) OR (${db.json('status')}='in_pubblicazione' AND COALESCE(${lease},0)<=?) ORDER BY updated_at LIMIT 100`).all(now(), Date.now());
      for (const row of rows) {
        const data = JSON.parse(row.data);
        if (data.status === 'in_coda' && new Date(data.scheduled_at).getTime() > Date.now() || data.social_job?.leaseUntil > Date.now()) continue;
        const legacy = !data.social_job;
        const job = data.social_job ||= { version: 1, attempt: randomUUID(), phase: data.status === 'in_pubblicazione' ? 'commit' : 'prepared', account_id: data.social_page_id, image_url: data.image_url, caption: [data.caption, data.hashtags].filter(Boolean).join('\n\n'), options: {}, legacy: true };
        const wasProcessing = data.status === 'in_pubblicazione';
        data.status = 'in_pubblicazione'; job.leaseUntil = Date.now() + 90000; job.startedAt ||= Date.now();
        let stored = JSON.stringify(data);
        // Condivide il blocco con scollegamento e riprogrammazione, anche su MySQL.
        const claimed = await transaction(db, () => db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(stored, now(), row.id, row.data));
        if (!claimed.changes) continue;
        const save = async (leaseMs = 90000) => {
          job.leaseUntil = Date.now() + leaseMs;
          const next = JSON.stringify(data);
          if (!(await db.prepare('UPDATE posts SET data=?,updated_at=? WHERE id=? AND data=?').run(next, now(), row.id, stored)).changes) throw Object.assign(new Error('Invio gestito da un’altra richiesta.'), { lostLease: true });
          stored = next;
        };
        try {
          if (wasProcessing && job.phase === 'commit' && !job.remote_id) throw Object.assign(new Error('Esito dell’invio non confermato. Controlla il profilo sul social prima di riprovare.'), { uncertain: true });
          const user = await db.prepare('SELECT * FROM users WHERE id=?').get(row.user_id);
          if (!user) fail(404, 'Account non disponibile.');
          if (user.plan !== 'pro' && !job.remote_id) fail(402, 'Il piano Pro non è attivo.');
          const provider = socialProvider(data.platform);
          /** Prima di esporre la foto a Instagram, verifica che l'account scelto sia ancora autorizzato anche per un invio programmato. */
          const connection = provider === 'instagram' && job.phase === 'prepared'
            ? (await social.verify(user, provider)).connection
            : await social.connection(user, provider);
          const headers = { Authorization: 'Bearer ' + connection.accessToken };
          const done = url => { data.status = 'pubblicato'; data.published_url = url || ''; data.published_at = now(); data.publication_method = provider; data.schedule_error = ''; job.phase = 'done'; };
          if (provider === 'facebook') {
            const page = connection.pages?.find(p => String(p.id) === job.account_id);
            if (!page) fail(409, 'Pagina Facebook non disponibile. Ricollegala dal Profilo.');
            const file = await ownImage(user, job.image_url);
            const form = new FormData(); form.set('source', new Blob([file.bytes], { type: file.mime }), file.name); form.set('message', job.caption); form.set('access_token', page.access_token);
            job.phase = 'commit'; await save();
            const output = await social.call(social.graph() + '/' + encodeURIComponent(page.id) + '/photos', { method: 'POST', body: form });
            if (!output.post_id || String(output.post_id).length > 200) throw Object.assign(new Error('Facebook non ha confermato il post. Controlla la Pagina prima di riprovare.'), { uncertain: true });
            job.remote_id = String(output.post_id); done('https://www.facebook.com/' + encodeURIComponent(output.post_id));
          } else if (provider === 'instagram') {
            if (!socialAccounts(provider, connection).some(account => account.id === job.account_id)) fail(409, 'L’account Instagram è cambiato. Ricollega quello scelto per questo post.');
            const graph = social.instagram(connection);
            if (job.phase === 'prepared') {
              const output = await social.call(graph + '/' + encodeURIComponent(job.account_id) + '/media', { method: 'POST', headers, body: new URLSearchParams({ image_url: mediaUrl(row.id, job, row.user_id), caption: job.caption }) });
              if (!output.id) fail(502, 'Instagram non ha accettato la foto.');
              job.container_id = String(output.id); job.phase = 'processing'; await save();
            }
            const status = await social.call(graph + '/' + encodeURIComponent(job.container_id) + '?fields=status_code', { headers });
            if (status.status_code === 'PUBLISHED') done();
            else if (['ERROR', 'EXPIRED'].includes(status.status_code)) { job.phase = 'failed'; fail(502, 'Instagram non ha elaborato la foto. Verifica il formato e riprova.'); }
            else if (status.status_code === 'FINISHED') {
              job.phase = 'commit'; await save();
              const output = await social.call(graph + '/' + encodeURIComponent(job.account_id) + '/media_publish', { method: 'POST', headers, body: new URLSearchParams({ creation_id: job.container_id }) });
              if (!output.id) throw Object.assign(new Error('Instagram non ha confermato l’esito. Controlla il profilo prima di riprovare.'), { uncertain: true });
              job.remote_id = String(output.id); done(); await save();
              // Il post è già confermato: un errore nel solo permalink non deve trasformarlo in fallimento.
              try { const info = await social.call(graph + '/' + encodeURIComponent(output.id) + '?fields=permalink', { headers }); if (/^https:\/\/(www\.)?instagram\.com\//.test(info.permalink || '')) data.published_url = info.permalink; } catch { /* Link facoltativo. */ }
            }
          } else {
            if (connection.account.id !== job.account_id) fail(409, 'L’account TikTok è cambiato. Ricollega quello scelto per questo post.');
            if (!job.remote_id) {
              const checked = await social.verify(user, 'tiktok');
              const options = validateTikTokOptions(job.options, checked.creator);
              const { is_aigc, ...postInfo } = options;
              delete postInfo.music_consent;
              delete postInfo.commercial_disclosure;
              job.phase = 'commit'; await save();
              const output = await social.call('https://open.tiktokapis.com/v2/post/publish/content/init/', { ...jsonBody({ media_type: 'PHOTO', post_mode: 'DIRECT_POST', is_aigc, post_info: { ...postInfo, description: job.caption }, source_info: { source: 'PULL_FROM_URL', photo_images: [mediaUrl(row.id, job, row.user_id)], photo_cover_index: 0 } }), headers: { ...headers, 'Content-Type': 'application/json' } });
              if (!output.data?.publish_id) throw Object.assign(new Error('TikTok non ha confermato la ricezione. Controlla il profilo prima di riprovare.'), { uncertain: true });
              job.remote_id = output.data.publish_id; job.phase = 'processing'; await save();
            }
            const output = await social.call('https://open.tiktokapis.com/v2/post/publish/status/fetch/', { ...jsonBody({ publish_id: job.remote_id }), headers: { ...headers, 'Content-Type': 'application/json' } });
            if (output.data?.status === 'PUBLISH_COMPLETE') done();
            else if (output.data?.status === 'FAILED') { job.phase = 'failed'; fail(502, 'TikTok non ha pubblicato il contenuto (' + String(output.data.fail_reason || 'errore').replace(/[^a-z0-9_]/gi, '').slice(0, 80) + '). Controlla formato e autorizzazioni.'); }
          }
          if (data.status === 'in_pubblicazione' && Date.now() - job.startedAt > 48 * 3600000) throw Object.assign(new Error('Il social non ha comunicato un esito definitivo. Controlla il profilo.'), { uncertain: true });
        } catch (error) {
          if (error.lostLease) continue;
          const uncertain = error.uncertain || job.phase === 'commit' && (error.transient || !error.status);
          if (job.phase === 'done') { /* Il social ha già confermato: riprova solo il salvataggio locale. */ }
          else if (uncertain) data.status = 'da_verificare';
          else if (job.phase === 'processing') {
            // Con un identificativo remoto si controlla solo l’esito; non si invia mai una seconda copia.
            data.status = Date.now() - job.startedAt > 48 * 3600000 ? 'da_verificare' : 'in_pubblicazione';
          } else data.status = 'fallito';
          data.schedule_error = job.phase === 'done' ? '' : error.status || error.uncertain ? error.message : 'Invio interrotto. Controlla il social prima di riprovare.';
          if (data.status === 'da_verificare') data.schedule_error = 'Esito da verificare sul social. Nessun nuovo invio automatico verrà tentato. ' + data.schedule_error;
        }
        // Mantiene la compatibilità dei vecchi post senza esporre credenziali nei dati della Libreria.
        if (legacy && data.status === 'pubblicato') data.editorial_at ||= data.scheduled_at;
        await save(30000);
      }
  }
  return { prepare, enqueue, media, resolve, publishDuePosts, waitForIdle: () => currentRun };
}
