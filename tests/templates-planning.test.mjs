import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { uid, now, digest } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { brandFromProfile, normalizeBrand, normalizeColor } from '../shared/brand.mjs';
import { FORMATS, TEMPLATES, LEGACY_TEMPLATES, getTemplate, designBrief, defaultDesign, normalizeDesign, imageRequestSize, cropSource, fitTextBox, fitLogoBox } from '../shared/templates.mjs';
import { backdropFor, overlayScore, rgb, textTreatment, logoTreatment } from '../shared/overlayContrast.mjs';
import { restoreStudioDraft } from '../src/lib/studioDraft.mjs';
import { editorialStage } from '../src/lib/editorialDates.mjs';
import { testDatabase } from './helpers/database.mjs';

test('cinque template sulla foto intera: testi e logo non si scontrano e lasciano spazio al soggetto in ogni formato', () => {
  assert.equal(TEMPLATES.length, 5);
  for (const template of TEMPLATES) for (const format of Object.keys(FORMATS)) {
    const { photo, heading, subtitle, logo, subject } = template.layouts[format];
    assert.deepEqual(photo, {x:0,y:0,width:1,height:1});
    const design = { ...defaultDesign(), template_id: template.id, template_version: template.version, format };
    const brief = designBrief(design), boxes = [...brief.reserved_areas, subject];
    for (const b of boxes) assert.ok(b.x >= 0 && b.y >= 0 && b.width > 0 && b.height > 0 && b.x + b.width <= 1.000001 && b.y + b.height <= 1.000001);
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      assert.ok(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y, template.id + ':' + format);
    }
    assert.deepEqual(brief.reserved_areas.map(b => b.role), ['heading','subtitle','logo']);
    for (const b of [heading, subtitle, logo]) {
      assert.ok(b.x >= .05 && b.x + b.width <= .95);
      if (format === '9:16') assert.ok(b.y >= .1 && b.y + b.height <= .87);
    }
    const [w,h] = imageRequestSize(design, 'gpt-image-2').split('x').map(Number);
    assert.ok(w % 16 === 0 && h % 16 === 0 && w / h <= 3 && w / h >= 1 / 3 && w * h >= 655360 && w * h < 1200000);
    assert.ok(Math.abs(w / h - FORMATS[format].width / FORMATS[format].height) < .025);
  }
  for (const format of Object.keys(FORMATS)) assert.equal(new Set(TEMPLATES.map(t => JSON.stringify(t.layouts[format]))).size, 5);
});
test('versioni: nuovi post con sovrapposizioni, composizioni precedenti conservate senza conversioni implicite', () => {
  assert.equal(defaultDesign().template_version,2);
  for (const old of LEGACY_TEMPLATES) {
    assert.equal(getTemplate(old.id, 1), old);
    assert.equal(getTemplate(old.id).version, 2);
    const saved = normalizeDesign({ ...defaultDesign(), template_id:old.id, template_version:1 });
    assert.equal(saved.template_version,1);
    const { template_version, ...unversioned } = saved;
    assert.equal(normalizeDesign(unversioned).template_version,template_version);
    assert.equal(designBrief(saved).reserved_areas,undefined);
  }
});
test('il logo mantiene proporzioni e ancoraggio esatto anche con marchi molto larghi o verticali', () => {
  for (const t of TEMPLATES) for (const f of Object.keys(FORMATS)) for (const [w,h] of [[900,120],[120,900],[400,400]]) {
    const area = t.layouts[f].logo, fitted = fitLogoBox(w,h,area,t.logoAlign,t.logoVertical);
    assert.ok(Math.abs(fitted.width / fitted.height - w / h) < .000001);
    assert.ok(fitted.x >= area.x && fitted.y >= area.y && fitted.x + fitted.width <= area.x + area.width + 1e-6 && fitted.y + fitted.height <= area.y + area.height + 1e-6);
    if (t.logoAlign === 'right') assert.ok(Math.abs(fitted.x + fitted.width - area.x - area.width) < 1e-6);
    if (t.logoAlign === 'left') assert.equal(fitted.x,area.x);
    if (t.logoAlign === 'center') assert.ok(Math.abs(fitted.x + fitted.width / 2 - area.x - area.width / 2) < 1e-6);
    if (t.logoVertical === 'bottom') assert.ok(Math.abs(fitted.y + fitted.height - area.y - area.height) < 1e-6);
    else assert.equal(fitted.y,area.y);
  }
});
test('contrasto: foto chiara, scura e disomogenea; correzione trasparente solo quando serve', () => {
  for (const pixels of [[[245,245,245]], [[12,12,12]], [[0,0,0],[255,255,255],[127,127,127],[220,40,20]]]) {
    const treatment = textTreatment(pixels, ['#163A3E','#F7F3E9','#C5A479','#FFFFFF']);
    assert.ok(treatment.opacity >= 0 && treatment.opacity <= .72);
    const pairs = pixels.map(paper => ({paper,ink:rgb(treatment.color)}));
    assert.ok(overlayScore(pairs,rgb(treatment.tint),treatment.opacity) >= 4.5);
    if (pixels.length === 1) assert.equal(treatment.opacity,0);
  }
  const lightLogo = [{ink:[255,255,255],paper:[255,255,255]}], treatment = backdropFor(lightLogo,3,.05);
  assert.ok(treatment.opacity > 0 && treatment.opacity < .72);
  assert.ok(overlayScore(lightLogo,rgb(treatment.tint),treatment.opacity,.05) >= 3);
  assert.deepEqual(lightLogo[0].ink,[255,255,255],'Il contrasto non ricolora il logo');
});
test('contrasto del logo: trasparenza e colori misti restano esportabili anche sotto soglia', () => {
  for (const pairs of [[], [{ink:[255,255,255],paper:[255,255,255],alpha:.15}], [0,128,255].map(v => ({ink:[v,v,v],paper:[128,128,128]}))]) {
    const before = structuredClone(pairs), treatment = logoTreatment(pairs);
    assert.equal(treatment.sufficient,false);
    assert.ok(treatment.opacity >= 0 && treatment.opacity <= .72);
    assert.ok(Number.isFinite(treatment.score));
    assert.ok(treatment.score >= overlayScore(pairs,[0,0,0],0,.05));
    assert.deepEqual(pairs,before,'La correzione non cambia i colori né l’opacità del marchio');
  }
  const translucent = [{ink:[255,255,255],paper:[0,0,0],alpha:.15}];
  assert.ok(overlayScore(translucent) < 2,'Il punteggio considera la trasparenza effettiva');
  assert.equal(logoTreatment([{ink:[255,255,255],paper:[255,255,255]}]).sufficient,true);
  assert.equal(logoTreatment([{ink:[0,0,0],paper:[255,255,255]}]).opacity,0);
});
test('colori HEX e RGB: conversione senza arrotondamenti o valori fuori intervallo', () => {
  for (const [input, expected] of [
    ['#ff8000','#FF8000'], ['ff8000','#FF8000'], [' #f80 ','#FF8800'], ['abc','#AABBCC'],
    ['rgb(255, 128, 0)','#FF8000'], ['255, 128, 0','#FF8000'], ['RGB( 0 , 0, 255 )','#0000FF'],
    ['rgb(255 255 255)','#FFFFFF'], ['0 0 0','#000000'],
  ]) assert.equal(normalizeColor(input),expected,input);
  for (const input of [null,1,{},'', 'red','#12345','#12345678','rgb(256, 0, 0)','-1, 0, 0','1.5, 2, 3','1, 2','1, 2, 3, 4','rgb(1, 2, 3','rgba(1, 2, 3, .5)','rgb(100%, 0%, 0%)','rgb(1 2 3 / 1)','rgb(1, 2, 3);color:red']) assert.equal(normalizeColor(input),'',String(input));
});
test('palette e font: quattro colori normalizzati, caratteri reali e nessun riferimento esterno', () => {
  const brand = brandFromProfile();
  assert.equal(normalizeBrand({ ...brand, colors: ['#aAbBcC','#000000','#112233','#FFFFFF'] }).colors[0], '#AABBCC');
  assert.throws(() => normalizeBrand({ ...brand, colors: brand.colors.slice(0,3) }));
  assert.throws(() => normalizeBrand({ ...brand, colors: ['red', ...brand.colors.slice(1)] }));
  assert.throws(() => normalizeBrand({ ...brand, fonts: { ...brand.fonts, heading: { family: 'Non installato', weight: 700 } } }));
  assert.throws(() => normalizeDesign({ ...defaultDesign(), format: '8:3' }));
  assert.throws(() => normalizeDesign({ ...defaultDesign(), template_version: 22 }));
  assert.throws(() => normalizeDesign({ ...defaultDesign(), crop: { x: -1, y: .5 } }));
});
test('ritaglio conserva le proporzioni e testi troppo lunghi vengono segnalati senza troncamento', () => {
  const crop = cropSource(2000, 1000, 600, 900, { x: 1, y: .5 });
  assert.equal(crop.x + crop.width, 2000); assert.equal(crop.height, 1000);
  assert.ok(Math.abs(crop.width / crop.height - 2/3) < .001);
  const fitted = fitTextBox('Un messaggio leggibile', { width: 300, height: 160 }, (text, size) => text.length * size * .5, { min: 24, max: 70 });
  assert.equal(fitted.lines.join(' '), 'Un messaggio leggibile');
  assert.throws(() => fitTextBox('UnaParolaLunghissimaCheNonDeveEssereTagliata', { width: 80, height: 40 }, (text, size) => text.length * size, { min: 20, max: 30 }));
});
test('bozze native: anche senza foto conservano brief, versione e identità', () => {
  const id = uid(), design = defaultDesign();
  const restored = restoreStudioDraft(JSON.stringify({ version:1, editingId:id, design, planning:{ topic:'Shooting di prova', notes:'Nota di collaudo' }, originalUrl:null }), {});
  assert.equal(restored.editingId,id); assert.deepEqual(restored.design,design); assert.equal(restored.originalUrl,null);
  assert.equal(restored.planning.topic,'Shooting di prova');
  assert.equal(restoreStudioDraft(JSON.stringify({version:1,design,planning:{topic:'Senza proprietario'}}),{}),null);
});

test('pianificazione e branding: persistenza, proprietà, generazione collegata e costi', async t => {
  mkdirSync(resolve('work/tests'), {recursive:true});
  const calls = [];
  let subtitle = 'Dettaglio verificato';
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');
  const app = await createApp({ ...await testDatabase(), dataDir:mkdtempSync(resolve('work/tests/planning-')), port:0, origin:'http://127.0.0.1:5180', localMode:true, scheduler:false,
    openaiKey:'test-only', textModel:'gpt-5.6-luna', imageModel:'gpt-image-2', smtpHost:'',
    fetchImpl:async (url, options) => {
      calls.push({ url, body:options.body });
      if (url.endsWith('/images/edits')) return Response.json({ data:[{ b64_json:png.toString('base64') }], usage:{input_tokens:10,output_tokens:20} });
      if (JSON.parse(options.body).text.format.name === 'photo_composition') return Response.json({ status: 'completed', usage: { input_tokens: 50, output_tokens: 60 }, output: [{ content: [{ type: 'output_text', text: JSON.stringify({ composition: { reliable: true, protected_regions: [], quiet_regions: [{ x: 0, y: 0, width: 1, height: 1 }] } }) }] }] });
      return Response.json({ status:'completed', model:'gpt-5.6-luna', usage:{input_tokens:30,output_tokens:40}, output:[{content:[{type:'output_text',text:JSON.stringify({headline:'Titolo di prova',graphic_subtitle:subtitle,caption:'Testo di collaudo',hashtags:'#test'})}]}] });
    } });
  t.after(() => app.close());
  await new Promise(resolve => app.server.listen(0,'127.0.0.1',resolve));
  const url = 'http://127.0.0.1:' + app.server.address().port;
  const user = { id:uid(), email:'planning@example.test', role:'user' }, other = {id:uid(),email:'other-planning@example.test',role:'user'};
  for (const item of [user,other]) await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'user','free','{}',?)").run(item.id,item.email,now());
  const token = 'a'.repeat(64), otherToken = 'b'.repeat(64);
  await app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config,token),user.id,Date.now()+3600000);
  await app.db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(app.config,otherToken),other.id,Date.now()+3600000);
  const request = async (path, data, method = 'POST', session = token) => {
    const res = await fetch(url + '/api' + path, { method, headers:{Origin:app.config.origin,Cookie:'clicksocial_session='+session,'Content-Type':Buffer.isBuffer(data)?'application/octet-stream':'application/json'}, ...(data !== undefined ? {body:Buffer.isBuffer(data)?data:JSON.stringify(data)} : {}) });
    const json = await res.json(); return {status:res.status, data:json};
  };
  const photo = (await saveImage(app.db,app.config,user,png,'foto.png')).file_url;
  const logo = (await saveImage(app.db,app.config,user,png,'logo.png')).file_url;
  const foreign = (await saveImage(app.db,app.config,other,png,'altro.png')).file_url;
  let brand = brandFromProfile({company_logo_url:logo}); brand.colors = ['#123456','#F8F8F8','#789ABC','#FEDCBA'];
  const fontBytes = readFileSync(resolve('public/fonts/DM-Sans.ttf'));
  const fontUpload = await request('/fonts',fontBytes);
  assert.equal(fontUpload.status,200);
  brand.fonts.body = {family:'DM Sans aziendale',url:fontUpload.data.file_url,weight:400};
  const updatedBrand = await request('/auth/me',{brand_settings:{...brand,colors:['rgb(18, 52, 86)','248, 248, 248','789abc','#fedcba']},preferred_template:'affiancato'},'PATCH');
  assert.equal(updatedBrand.status,200); assert.deepEqual(updatedBrand.data.brand_settings.colors,brand.colors);
  assert.equal((await request('/auth/me',{brand_settings:{...brand,colors:['rgb(256, 0, 0)',...brand.colors.slice(1)]}},'PATCH')).status,400);
  assert.deepEqual((await request('/auth/me',undefined,'GET')).data.brand_settings.colors,brand.colors);
  assert.equal((await request('/auth/me',{brand_settings:{...brand,logos:{color:{url:foreign}}}},'PATCH')).status,404);
  assert.equal((await request('/auth/me',{brand_settings:{...brand,colors:['#123456']}},'PATCH')).status,400);
  assert.equal((await request('/auth/me',{brand_settings:brand},'PATCH',otherToken)).status,404);
  assert.equal((await request('/fonts',png)).status,400);
  assert.equal((await request('/files',fontBytes)).status,400);
  assert.equal((await request('/auth/me',{brand_settings:{...brand,logos:{color:{url:fontUpload.data.file_url}}}},'PATCH')).status,400);
  const design = {template_id:'affiancato',template_version:2,format:'4:5'};
  const plan = await request('/entities/Post',{planning:{topic:'Bozza senza fotografia',objective:'Obiettivo concordato',shots:'Dettaglio da fotografare',provisional_copy:'Indicazione del cliente'},editorial_at:'2026-10-01T08:00:00.000Z',design,mode:'creative'});
  assert.equal(plan.status,200); const id = plan.data.id;
  assert.equal(plan.data.status,'bozza'); assert.equal(plan.data.image_url,undefined);
  assert.deepEqual(plan.data.design.brand,brand); assert.equal(plan.data.scheduled_at,undefined);
  assert.equal(calls.length,0); assert.equal(editorialStage(plan.data),'da_preparare');
  assert.equal((await request('/posts/'+id+'/mark-published',{})).status,409);
  assert.equal((await request('/entities/Post/'+id,undefined,'GET',otherToken)).status,404);
  assert.equal((await request('/entities/Post/'+id,{planning:{topic:'Accesso altrui'}},'PATCH',otherToken)).status,404);
  const invalid = await request('/functions/generateCopy',{file_url:photo,draft_id:id,design:{...design,format:'non-valido'}});
  assert.equal(invalid.status,400); assert.equal(calls.length,0);
  assert.equal((await request('/functions/generateCopy',{file_url:foreign,draft_id:id},'POST',otherToken)).status,404);
  await request('/auth/me',{brand_settings:{...brand,colors:['#AA0000','#EEEEEE','#777777','#FFFFFF']}},'PATCH');
  const generated = await request('/functions/generateCopy',{file_url:photo,draft_id:id,mode:'creative',platform:'instagram'});
  assert.equal(generated.status,200); assert.equal(calls.length,3);
  assert.deepEqual(generated.data.design.brand,brand,'La bozza mantiene la propria identità salvata');
  assert.equal(generated.data.logo_placement,undefined); assert.equal(generated.data.logo_url,undefined);
  const copyRequest = JSON.parse(calls[0].body), imagePrompt = calls[1].body.get('prompt');
  assert.match(copyRequest.input[0].content[0].text,/Obiettivo concordato/); assert.match(copyRequest.input[0].content[0].text,/#123456/);
  assert.match(copyRequest.input[0].content[0].text,/Indicazione del cliente/);
  assert.doesNotMatch(copyRequest.input[0].content[0].text,/#AA0000/,'La nuova palette del Profilo non deve contraddire quella salvata nella bozza');
  assert.doesNotMatch(imagePrompt,/#AA0000/);
  assert.equal(copyRequest.reasoning.effort,'none'); assert.equal(copyRequest.max_output_tokens,1200);
  assert.ok(copyRequest.input[0].content.some(c => c.type === 'input_image'));
  assert.match(imagePrompt,/SOLO la parte fotografica/); assert.match(imagePrompt,/#123456/);
  assert.match(imagePrompt,/Non aggiungere titoli/); assert.equal(calls[1].body.get('model'),'gpt-image-2');
  assert.match(imagePrompt,/reserved_areas/); assert.match(imagePrompt,/subject_area/);
  assert.match(imagePrompt,/Testi a destra, logo in basso a sinistra/);
  assert.match(imagePrompt,/sfondo fotografico continuo/);
  assert.match(imagePrompt,/Non collocarvi volti, prodotti/);
  assert.match(copyRequest.input[0].content[0].text,/reserved_areas/);
  const saved = await request('/entities/Post/'+id,{image_url:photo,original_image_url:photo,graphic_url:generated.data.graphic_url,headline:generated.data.headline,graphic_subtitle:generated.data.graphic_subtitle,design:generated.data.design,status:'pronto'},'PATCH');
  assert.equal(saved.status,200); assert.equal(saved.data.id,id); assert.equal(saved.data.planning.topic,'Bozza senza fotografia');
  assert.equal(saved.data.editorial_at,'2026-10-01T08:00:00.000Z'); assert.equal(editorialStage(saved.data),'post_creato');
  assert.equal(saved.data.status,'pronto'); assert.equal(saved.data.scheduled_at,undefined);
  const changedFormat = await request('/entities/Post/'+id,{design:{...saved.data.design,format:'16:9'}},'PATCH');
  assert.equal(changedFormat.status,200); assert.equal(changedFormat.data.format,'16:9'); assert.equal(calls.length,3);
  const log = JSON.parse((await app.db.prepare('SELECT data FROM ai_logs WHERE user_id=?').get(user.id)).data);
  assert.equal(log.ai_calls.length,3); assert.equal(log.text_requests,2); assert.equal(log.status,'success');
  assert.equal((await app.db.prepare('SELECT ai_used FROM users WHERE id=?').get(user.id)).ai_used,1);
  subtitle = 'X'.repeat(designBrief({...saved.data.design,template_id:'foto',format:'1:1'}).max_subtitle + 1);
  const tooLong = await request('/functions/generateCopy',{file_url:photo,mode:'creative',design:{...saved.data.design,template_id:'foto',format:'1:1'}});
  assert.equal(tooLong.status,502);
  assert.equal(calls.length,4,'Il testo fuori misura deve fermare la richiesta prima di generare la foto a pagamento');
  assert.equal((await app.db.prepare('SELECT ai_used FROM users WHERE id=?').get(user.id)).ai_used,1);
});
