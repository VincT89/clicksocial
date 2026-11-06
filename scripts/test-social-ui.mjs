import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createApp } from '../server/app.mjs';
import { digest, now } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';

// Browser headless dedicato, database nuovo e fornitori fittizi: nessuna sessione utente o rete social reale.
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ? pathToFileURL(resolve(process.env.PLAYWRIGHT_MODULE)).href : 'playwright');
const directory = resolve('work/tests', 'social-ui-' + randomUUID());
mkdirSync(directory, { recursive:true });
const origin = 'https://clicksocial-ui.example.test';
let deniedProvider = '';
const permissions = values => ({ data:values.map(permission => ({ permission, status:'granted' })) });
const instagramConfig = '10001';
const fetchImpl = async (value) => {
  const url = new URL(value);
  if (url.hostname === 'graph.facebook.com') {
    if (url.pathname.endsWith('/oauth/access_token')) return Response.json({ access_token:'test-token' });
    if (url.pathname.endsWith('/debug_token')) return Response.json({ data:{ app_id:'test', type:'SYSTEM_USER', is_valid:true, scopes:['instagram_basic','instagram_content_publish'] } });
    if (url.pathname.endsWith('/me/assigned_instagram_accounts')) return Response.json({ data:[{ id:'secondo-test', username:'secondo_profilo' }, { id:'instagram-test', username:'profilo_di_collaudo' }] });
    if (url.pathname.endsWith('/instagram-test/media')) return Response.json({ id:'contenitore-test' });
    if (url.pathname.endsWith('/contenitore-test')) return Response.json({ status_code:'FINISHED' });
    if (url.pathname.endsWith('/instagram-test/media_publish')) return Response.json({ id:'foto-test' });
    if (url.pathname.endsWith('/foto-test')) return Response.json({ permalink:'https://www.instagram.com/p/collaudo/' });
    if (url.pathname.endsWith('/me/permissions')) return Response.json(permissions(['pages_show_list','pages_read_engagement','pages_manage_posts']));
    if (url.pathname.endsWith('/me/accounts')) return Response.json({ data:[{ id:'page-one', name:'Prima pagina di collaudo', access_token:'test-one' }, { id:'page-two', name:'Seconda pagina di collaudo', access_token:'test-two' }] });
    if (url.pathname.endsWith('/photos')) return Response.json({ post_id:'test-published' });
  }
  if (url.hostname === 'open.tiktokapis.com') {
    if (url.pathname.endsWith('/oauth/token/')) return Response.json({ access_token:'tt-test', refresh_token:'tt-refresh-test', open_id:'tiktok-test', scope:'user.info.basic,video.publish', expires_in:86400 });
    if (url.pathname.endsWith('/user/info/')) return Response.json({ data:{ user:{ open_id:'tiktok-test', display_name:'TikTok di collaudo' } }, error:{ code:'ok' } });
    if (url.pathname.endsWith('/creator_info/query/')) return Response.json({ data:{ creator_nickname:'TikTok di collaudo', privacy_level_options:['SELF_ONLY','PUBLIC_TO_EVERYONE'], comment_disabled:true }, error:{ code:'ok' } });
  }
  throw new Error('Chiamata non prevista nel collaudo: ' + url.origin + url.pathname);
};
let app, browser;
try {
  app = await createApp({ useProjectEnv:false, dataDir:join(directory,'data'), dbDriver:'sqlite', origin, localMode:false, port:0, scheduler:false,
    smtpHost:'', openaiKey:'', stripeKey:'', googleId:'', metaId:'test', metaSecret:'test', metaLoginConfigId:'', instagramLoginConfigId:instagramConfig, instagramId:'', instagramSecret:'', tiktokKey:'test', tiktokSecret:'test', fetchImpl });
  await new Promise(resolve => app.server.listen(0, '127.0.0.1', resolve));
  const local = 'http://127.0.0.1:' + app.server.address().port;
  browser = await chromium.launch({ headless:true, ...(process.env.CLICKSOCIAL_BROWSER_CHANNEL ? { channel:process.env.CLICKSOCIAL_BROWSER_CHANNEL } : {}) });
  const context = await browser.newContext({ viewport:{ width:1280, height:900 }, deviceScaleFactor:1 });
  context.setDefaultTimeout(15000);
  const failures = [];
  context.on('page', page => {
    page.on('pageerror', error => failures.push(error.message));
    page.on('requestfailed', request => console.error('Richiesta di collaudo interrotta:', new URL(request.url()).pathname, request.failure()?.errorText));
  });
  await context.route('**/*', async route => {
    const request = route.request(), url = new URL(request.url());
    if (url.origin === origin) {
      const response = await context.request.fetch(local + url.pathname + url.search, { method:request.method(), headers:await request.allHeaders(), data:request.postDataBuffer() || undefined, maxRedirects:0, timeout:10000 });
      if (url.pathname === '/api/social/authorize' && response.status() === 302) {
        // Il backend prepara il consenso vero; solo la pagina del fornitore viene sostituita con una fixture locale.
        const destination = new URL(response.headers().location);
        const provider = destination.hostname === 'www.facebook.com' && destination.pathname.endsWith('/dialog/oauth')
          ? (destination.searchParams.get('config_id') === instagramConfig ? 'instagram' : 'facebook')
          : destination.hostname === 'www.tiktok.com' && destination.pathname === '/v2/auth/authorize/' ? 'tiktok' : '';
        assert.ok(provider, 'Destinazione OAuth non prevista');
        assert.equal(destination.searchParams.get('redirect_uri'), origin + '/api/social/' + provider + '/callback');
        assert.equal(destination.searchParams.get('state'), url.searchParams.get('id'));
        const callback = new URL(destination.searchParams.get('redirect_uri'));
        callback.searchParams.set('state', destination.searchParams.get('state'));
        callback.searchParams.set(deniedProvider === provider ? 'error' : 'code', deniedProvider === provider ? 'access_denied' : 'test-code');
        const headers = { ...response.headers(), 'content-type':'text/html; charset=utf-8' };
        delete headers.location; delete headers['content-length'];
        return route.fulfill({ status:200, headers, body:'<!doctype html><html lang="it"><title>Consenso simulato</title><a href="' + callback.href.replaceAll('&','&amp;') + '">Continua il collaudo</a></html>' });
      }
      return route.fulfill({ response });
    }
    return route.abort();
  });
  const page = await context.newPage();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 1080;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#d8e5db'; ctx.fillRect(0,0,1080,1080);
    ctx.fillStyle = '#243428'; ctx.font = '48px sans-serif'; ctx.fillText('Foto di collaudo', 100, 540);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const user = { id:randomUUID(), plan:'pro', role:'user' }, session = randomBytes(32).toString('hex');
  await app.db.prepare('INSERT INTO users(id,email,verified,plan,created_at) VALUES (?,?,1,?,?)').run(user.id,'ui-test@example.test','pro',now());
  await app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config,session),user.id,Date.now()+3600000);
  await context.addCookies([{ name:'clicksocial_session', value:session, url:origin, httpOnly:true, secure:true, sameSite:'Lax' }]);
  const image = await saveImage(app.db,app.config,user,Buffer.from(png,'base64'),'foto-collaudo.png');
  const posts = {};
  for (const provider of ['facebook','instagram','tiktok']) {
    const id = posts[provider] = randomUUID();
    await app.db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(id,user.id,JSON.stringify({ platform:provider, title:'Collaudo ' + provider, caption:'Testo della foto', hashtags:'#collaudo', image_url:image.file_url, mode:'original', status:'pronto' }),now(),now());
  }
  await page.goto(origin + '/profilo?section=social');
  async function startConnection(provider, label) {
    const popupReady = context.waitForEvent('page');
    const responseReady = page.waitForResponse(response => new URL(response.url()).pathname === '/api/social/' + provider + '/connect');
    await page.getByRole('button', { name:label, exact:true }).click();
    const popup = await popupReady;
    const flow = await (await responseReady).json();
    await popup.getByRole('link', { name:'Continua il collaudo', exact:true }).click();
    await popup.getByRole('link', { name:'Torna a ClickSocial', exact:true }).waitFor();
    return { popup, flow };
  }
  async function nextPoll() {
    await page.waitForResponse(response => /^\/api\/social\/flows\/[a-f0-9]{64}$/.test(new URL(response.url()).pathname));
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  }
  async function assertEnabled(name) {
    const button = page.getByRole('button', { name, exact:true });
    /** La conferma chiude il pannello prima di completare il ricaricamento: attendi anche lo stato abilitato. */
    await button.click({ trial:true });
    assert.ok(await button.isEnabled(), name + ' deve essere utilizzabile');
  }
  const first = await startConnection('facebook', 'Collega Facebook');
  await first.popup.getByRole('link', { name:'Torna a ClickSocial', exact:true }).click();
  await first.popup.getByRole('checkbox', { name:'Seconda pagina di collaudo' }).check();
  await first.popup.getByRole('button', { name:'Conferma account selezionati' }).click();
  await first.popup.getByRole('button', { name:'Ricollega Facebook', exact:true }).waitFor();
  await page.bringToFront();
  await assertEnabled('Ricollega Facebook');
  assert.equal(await page.getByRole('alert').count(), 0);
  await first.popup.close();
  await page.reload();
  await assertEnabled('Ricollega Facebook');
  assert.equal(await page.getByRole('alert').count(), 0);
  console.log('Conferma nella finestra di ritorno riconosciuta anche nella scheda iniziale e dopo il ricaricamento.');

  // Un errore reale di conferma non deve sparire quando si aggiorna il tentativo o lo stato degli account.
  const originalFacebookPost = (await app.db.prepare('SELECT data FROM posts WHERE id=?').get(posts.facebook)).data;
  await app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify({ ...JSON.parse(originalFacebookPost), status:'da_verificare', social_job:{ account_id:'page-two' } }), posts.facebook);
  const retry = await startConnection('facebook', 'Ricollega Facebook');
  await retry.popup.close();
  await page.bringToFront();
  await page.getByRole('checkbox', { name:'Prima pagina di collaudo' }).check();
  await page.getByRole('button', { name:'Conferma account selezionati' }).click();
  const confirmationError = page.getByRole('alert').filter({ hasText:'Un invio è in corso o da verificare.' });
  await confirmationError.waitFor();
  await nextPoll();
  assert.ok(await confirmationError.isVisible(), 'Errore perso dopo il controllo automatico');
  const checked = page.waitForResponse(response => new URL(response.url()).pathname === '/api/social/status');
  await page.getByRole('button', { name:'Verifica collegamenti', exact:true }).click();
  await checked;
  await nextPoll();
  assert.ok(await confirmationError.isVisible(), 'Errore perso dopo Verifica collegamenti');
  await page.getByRole('checkbox', { name:'Prima pagina di collaudo' }).uncheck();
  await page.getByRole('checkbox', { name:'Seconda pagina di collaudo' }).check();
  await page.getByRole('button', { name:'Conferma account selezionati' }).click();
  await page.getByRole('button', { name:'Conferma account selezionati' }).waitFor({ state:'hidden' });
  await assertEnabled('Ricollega Facebook');
  assert.equal(await page.getByRole('alert').count(), 0);
  await app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(originalFacebookPost, posts.facebook);
  console.log('Errore persistente, aggiornamento dello stato e nuovo tentativo verificati.');

  // Anche con finestra bloccata il cliente deve poter aprire il consenso e poi annullare da una seconda finestra.
  const originalOpen = await page.evaluateHandle(() => window.open);
  await page.evaluate(() => { window.open = () => null; });
  await page.getByRole('button', { name:'Ricollega Facebook', exact:true }).click();
  await page.getByRole('alert').filter({ hasText:'Il browser ha bloccato la finestra.' }).waitFor();
  await nextPoll();
  assert.ok(await page.getByRole('alert').filter({ hasText:'Il browser ha bloccato la finestra.' }).isVisible());
  await page.evaluate(original => { window.open = original; }, originalOpen);
  await originalOpen.dispose();
  const fallbackReady = context.waitForEvent('page');
  await page.getByRole('link', { name:'Apri autorizzazione', exact:true }).click();
  const fallback = await fallbackReady;
  await fallback.getByRole('link', { name:'Continua il collaudo', exact:true }).click();
  await fallback.getByRole('link', { name:'Torna a ClickSocial', exact:true }).click();
  await fallback.getByRole('checkbox', { name:'Seconda pagina di collaudo' }).waitFor();
  await fallback.getByRole('button', { name:'Annulla collegamento', exact:true }).click();
  await fallback.getByRole('button', { name:'Annulla collegamento', exact:true }).waitFor({ state:'hidden' });
  await page.bringToFront();
  await page.getByRole('button', { name:'Annulla collegamento', exact:true }).waitFor({ state:'hidden' });
  await assertEnabled('Ricollega Facebook');
  assert.equal(await page.getByRole('alert').count(), 0);
  await fallback.close();

  deniedProvider = 'facebook';
  const denied = await startConnection('facebook', 'Ricollega Facebook');
  await denied.popup.close();
  await page.bringToFront();
  await page.getByText('Autorizzazione annullata. Il collegamento precedente non è stato modificato.', { exact:true }).waitFor();
  await page.getByRole('button', { name:'Chiudi e riprova', exact:true }).click();
  await page.getByRole('button', { name:'Chiudi e riprova', exact:true }).waitFor({ state:'hidden' });
  await assertEnabled('Ricollega Facebook');
  deniedProvider = '';
  const expired = await startConnection('facebook', 'Ricollega Facebook');
  await expired.popup.close();
  await app.db.prepare('UPDATE oauth_states SET expires=0 WHERE hash=?').run(digest(app.config, expired.flow.id));
  await page.bringToFront();
  await page.getByRole('alert').filter({ hasText:'Questo tentativo è scaduto o è già stato chiuso.' }).waitFor();
  await assertEnabled('Ricollega Facebook');
  assert.equal((await app.integrations.social.status(user)).facebook.accounts[0].id, 'page-two');
  console.log('Finestra bloccata, annullamento tra finestre, consenso rifiutato e scadenza verificati.');

  for (const [provider, name, account] of [['instagram', 'Instagram', '@profilo_di_collaudo']]) {
    const authorization = await startConnection(provider, 'Collega ' + name);
    await authorization.popup.close();
    await page.bringToFront();
    await page.getByRole('checkbox', { name:account, exact:true }).check();
    await page.getByRole('button', { name:'Conferma account selezionati' }).click();
    await assertEnabled('Ricollega ' + name);
    assert.equal(await page.getByRole('alert').count(), 0);
    if (provider === 'instagram') assert.deepEqual((await app.integrations.social.status(user)).instagram.accounts, [{ id:'instagram-test', name:account }]);
  }
  assert.equal(await page.getByRole('button', { name: /Collega TikTok/i }).count(), 0);
  console.log('Collegamento Instagram confermato senza sostituire Facebook; TikTok nascosto.');

  async function layout(label, capture = true) {
    const size = page.viewportSize();
    const overflow = await page.evaluate(() => ({ page:document.documentElement.scrollWidth > window.innerWidth + 1,
      dialogs:[...document.querySelectorAll('[role="dialog"]')].map(element => { const r = element.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom, width:element.clientWidth, scroll:element.scrollWidth }; }) }));
    assert.equal(overflow.page,false,label + ': scorrimento orizzontale');
    for (const box of overflow.dialogs) {
      assert.ok(box.left >= -1 && box.right <= size.width+1 && box.top >= -1 && box.bottom <= size.height+1, label + ': dialogo fuori schermo ' + JSON.stringify(box));
      assert.ok(box.scroll <= box.width+1, label + ': dialogo troppo largo');
    }
    if (capture) await page.screenshot({ path:join(directory,label + '.png'), fullPage:overflow.dialogs.length === 0, animations:'disabled' });
  }
  async function guide(label) {
    await page.getByRole('button', { name:'Guida', exact:true }).click();
    await page.getByRole('button', { name:'Chiudi guida' }).waitFor();
    for (let step=0; step<30; step++) {
      await layout(label + '-' + step, step === 0);
      const finish = page.getByRole('button', { name:'Fine', exact:true });
      if (await finish.isVisible()) { await finish.click(); return; }
      await page.getByRole('button', { name:'Avanti', exact:true }).click();
    }
    assert.fail('Guida senza conclusione: ' + label);
  }
  const longWord = 'TitoloSenzaSpazi'.repeat(10);
  const homeFixtures = [
    { title:'Anteprima programmata ' + longWord, status:'in_coda', scheduled_at:new Date(Date.now()+3600000).toISOString() },
    { title:'Bozza con titolo esteso ' + longWord, status:'bozza' },
  ];
  for (const fixture of homeFixtures) {
    const record = { ...fixture, platform:'instagram', image_url:image.file_url };
    await app.db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(randomUUID(),user.id,JSON.stringify(record),now(),now());
  }
  for (const [width,height] of [[320,844],[390,844],[768,900],[1280,900],[844,390]]) {
    await page.setViewportSize({ width, height });
    await page.goto(origin + '/');
    await page.getByRole('heading', { name:'Il tuo spazio social' }).waitFor();
    for (const fixture of homeFixtures) await page.locator('.home-main .workspace-post-row').getByText(fixture.title, { exact:true }).waitFor();
    const rowsFit = await page.locator('.home-main .workspace-post-row').evaluateAll((rows, viewportWidth) => rows.every(row => {
      const list = row.closest('ul').getBoundingClientRect();
      const card = row.getBoundingClientRect();
      const arrow = row.lastElementChild.getBoundingClientRect();
      return card.left >= list.left-1 && card.right <= list.right+1 && card.right <= viewportWidth && arrow.right <= card.right;
    }), width);
    assert.ok(rowsFit, 'Una riga della Home supera la propria colonna a ' + width + ' px');
    await layout('home-' + width);
    await page.goto(origin + '/profilo?section=social');
    await page.getByRole('button', { name:'Ricollega Instagram' }).waitFor();
    await layout('profilo-' + width);
    await guide('guida-profilo-' + width);
    await page.goto(origin + '/studio');
    await page.getByRole('heading', { name:'Crea il tuo post' }).waitFor();
    await layout('studio-' + width);
    await guide('guida-studio-' + width);
    await page.goto(origin + '/library');
    await page.getByRole('heading', { name:'Post salvati' }).waitFor();
    await page.getByRole('button', { name:'Tutti', exact:true }).click();
    await page.getByRole('article', { name:'Collaudo tiktok' }).waitFor();
    await layout('libreria-' + width);
    await guide('guida-libreria-' + width);
    assert.ok(await page.getByRole('article', { name:'Collaudo tiktok' }).getByRole('button', { name:'Pubblica', exact:true }).isDisabled(), 'I vecchi post restano visibili senza riattivare TikTok');
    await page.getByRole('article', { name:'Collaudo instagram' }).getByRole('button', { name:'Pubblica', exact:true }).click();
    await page.getByLabel('Account di destinazione').waitFor();
    await selectValue(page, page.getByLabel('Account di destinazione'), 'instagram-test');
    await layout('invio-instagram-' + width);
    await page.getByRole('button', { name:'Conferma pubblicazione', exact:true }).click({ trial:true });
    await page.getByLabel('Testo e hashtag').fill('x'.repeat(2201));
    await page.getByText('Accorcia il testo di almeno 1 caratteri.').waitFor();
    assert.ok(await page.getByRole('button', { name:'Conferma pubblicazione', exact:true }).isDisabled());
    await page.keyboard.press('Escape');
    console.log('Interfaccia e guide verificate a ' + width + '×' + height + '.');
  }
  // Conferma esplicita completa, conversione JPEG e persistenza tramite il vero backend di test.
  await page.getByRole('article', { name:'Collaudo instagram' }).getByRole('button', { name:'Pubblica', exact:true }).click();
  await selectValue(page, page.getByLabel('Account di destinazione'), 'instagram-test');
  await page.getByLabel('Testo e hashtag').fill('Testo approvato nel collaudo');
  await page.getByRole('button', { name:'Conferma pubblicazione', exact:true }).click();
  await page.getByRole('dialog').waitFor({ state:'hidden' });
  const queued = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(posts.instagram)).data);
  assert.equal(queued.status,'in_coda'); assert.equal(queued.social_job.caption,'Testo approvato nel collaudo');
  const file = await app.db.prepare('SELECT mime FROM files WHERE id=?').get(queued.social_job.image_url.split('/').pop());
  assert.equal(file.mime,'image/jpeg');
  await app.integrations.publication.publishDuePosts();
  await page.getByRole('button', { name:'Aggiorna', exact:true }).click();
  await page.getByRole('article', { name:'Collaudo instagram' }).getByText('Pubblicato', { exact:true }).waitFor();
  console.log('Post Instagram pubblicato e visibile in Libreria con il fornitore simulato.');
  const dualId = randomUUID(), dualTitle = 'Collaudo dei due canali';
  const dualDraft = { platform:'instagram', title:dualTitle, caption:'Una foto per entrambi', image_url:image.file_url, original_image_url:image.file_url, mode:'original', status:'bozza' };
  await app.db.prepare('INSERT INTO posts VALUES (?,?,?,?,?)').run(dualId,user.id,JSON.stringify(dualDraft),now(),now());
  await page.setViewportSize({ width:393, height:852 });
  await page.goto(origin + '/studio?id=' + dualId);
  const channels = page.getByRole('group', { name:'Pubblica su', exact:true });
  assert.ok(await channels.getByRole('switch', { name:'Instagram' }).isChecked());
  await channels.locator('label').filter({ hasText:'Facebook' }).click();
  assert.ok(await channels.getByRole('switch', { name:'Instagram' }).isChecked());
  assert.ok(await channels.getByRole('switch', { name:'Facebook' }).isChecked());
  assert.equal(await page.locator('.studio-content').evaluate(el => getComputedStyle(el).scrollbarWidth), 'none');
  await page.getByRole('button', { name:'Salva in bozze', exact:true }).click(); await page.waitForURL('**/library?view=drafts');
  await page.getByRole('article', { name:dualTitle }).getByText('Instagram e Facebook', { exact:false }).waitFor();
  await page.goto(origin + '/studio?id=' + dualId); await channels.waitFor();
  assert.ok(await channels.getByRole('switch', { name:'Facebook' }).isChecked());
  await page.getByRole('button', { name:'Pubblica', exact:true }).click();
  const confirmation = page.getByRole('dialog', { name:'Pubblica su Instagram e Facebook' });
  await confirmation.waitFor();
  await selectValue(page, confirmation.getByLabel('Pagina Facebook'), 'page-two');
  await selectValue(page, confirmation.getByLabel('Account Instagram'), 'instagram-test');
  await layout('conferma-due-canali-iphone');
  assert.equal(JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(dualId)).data).status, 'bozza');
  await confirmation.getByRole('button', { name:'Conferma pubblicazione' }).click(); await page.waitForURL('**/library');
  await app.integrations.publication.publishDuePosts();
  await page.getByRole('button', { name:'Aggiorna', exact:true }).click();
  await page.waitForFunction(title => [...document.querySelectorAll('article')].filter(card => card.getAttribute('aria-label') === title && card.textContent.includes('Pubblicato')).length === 2, dualTitle);
  console.log('Scelta doppia, riapertura, conferma unica e due pubblicazioni simulate verificate.');
  // Un'anteprima non disponibile non deve consentire un invio alla cieca.
  const broken = JSON.parse((await app.db.prepare('SELECT data FROM posts WHERE id=?').get(posts.facebook)).data);
  broken.image_url = '/api/files/' + randomUUID();
  await app.db.prepare('UPDATE posts SET data=? WHERE id=?').run(JSON.stringify(broken),posts.facebook);
  await page.getByRole('button', { name:'Aggiorna', exact:true }).click();
  await page.getByRole('article', { name:'Collaudo facebook' }).getByRole('button', { name:'Pubblica', exact:true }).click();
  await selectValue(page, page.getByLabel('Pagina Facebook'), 'page-two');
  await page.getByText('Non riesco a mostrare la foto.', { exact:false }).waitFor();
  assert.ok(await page.getByRole('button', { name:'Conferma pubblicazione', exact:true }).isDisabled());
  await page.keyboard.press('Escape');
  assert.deepEqual(failures,[],'Errori JavaScript nel browser');
  console.log('Collaudo UI completato. Schermate: ' + directory);
} catch (error) {
  for (const page of browser?.contexts()[0]?.pages() || []) {
    console.error('Pagina di collaudo:', page.url());
    console.error((await page.locator('body').innerText({ timeout:3000 }).catch(() => 'Documento non disponibile')).slice(0,3000));
  }
  throw error;
} finally { await browser?.close(); await app?.close(); }

async function selectValue(page, control, value) {
  await control.click();
  await page.locator('[role="option"][data-option-value=' + JSON.stringify(String(value)) + ']').click();
}
