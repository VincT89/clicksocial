import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { saveImage } from '../server/files.mjs';
import { uid, now } from '../server/store.mjs';
import { testDatabase } from './helpers/database.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=', 'base64');
const placement = { x:0.65, y:0.08, width:0.25, height:0.18, background:'none', logo_background:'white', logo_background_points:[],
  protected_regions:[{x:0.05,y:0.45,width:0.9,height:0.4}] };
const textResult = (value, usage) => ({output:[{content:[{type:'output_text', text:JSON.stringify(value)}]}], usage});
const copy = textResult({headline:'Titolo di collaudo',caption:'Contenuto di prova',hashtags:'#test'}, {input_tokens:41,output_tokens:12});

test('Generazione con logo: proprietà, composizione, consumi e recupero dagli errori', async t => {
  mkdirSync(resolve('work/tests'), {recursive:true});
  const app = await createApp({...await testDatabase(), dataDir:mkdtempSync(resolve('work/tests/logo-generation-')),
    localMode:true, scheduler:false, openaiKey:'test-only', textModel:'vision-test', imageModel:'image-test',
    fetchImpl:async()=>{throw new Error('Nessuna rete reale nei test');}});
  t.after(()=>app.close());
  const user={id:uid(),email:'logo@example.test',role:'user'};
  await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'user','free','{}',?)").run(user.id,user.email,now());
  const other={id:uid(),email:'other-logo@example.test'};
  await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'user','free','{}',?)").run(other.id,other.email,now());
  const photo=(await saveImage(app.db,app.config,user,png,'foto.png')).file_url;
  // Contenuti diversi consentono di verificare quali byte sono inviati al modello.
  const logoBytes=Buffer.concat([png,Buffer.from('logo-fixture')]);
  const logo=(await saveImage(app.db,app.config,user,logoBytes,'logo.png')).file_url;
  const otherLogo=(await saveImage(app.db,app.config,other,logoBytes,'logo.png')).file_url;
  const setLogo=async value=>app.db.prepare('UPDATE users SET profile=?,ai_used=0 WHERE id=?').run(JSON.stringify({company_logo_url:value}),user.id);
  const latestLog=async()=>JSON.parse((await app.db.prepare('SELECT data FROM ai_logs WHERE user_id=? ORDER BY created_at DESC').get(user.id)).data);
  const quota=async()=>(await app.db.prepare('SELECT ai_used FROM users WHERE id=?').get(user.id)).ai_used;
  const body={file_url:photo,mode:'creative'};
  const provider=(layout=placement,usage={input_tokens:80,output_tokens:20},failLayout=false,modelConfig={})=>{
    const calls=[];
    const ai=createIntegrations(app.db,{...app.config,...modelConfig},async(url,options)=>{
      calls.push({url,body:options.body});
      if(url.endsWith('/images/edits')) return Response.json({data:[{b64_json:png.toString('base64')}]});
      const payload=JSON.parse(options.body);
      if(payload.text.format.name==='social_copy') return Response.json(copy);
      if(failLayout) return Response.json({error:{message:'Errore analisi di prova'}},{status:500});
      return Response.json(textResult(layout,usage));
    });
    return {ai,calls};
  };
  await t.test('analizza la grafica finale e il logo salvato, restituisce il layout e somma i token', async()=>{
    await setLogo(logo);
    const {ai,calls}=provider();
    const result=await ai.generateCopy(user,{...body,logo_url:otherLogo});
    assert.equal(calls.length,3);
    assert.equal(result.logo_url,logo);
    assert.deepEqual(result.logo_placement,placement);
    assert.ok(result.graphic_url.startsWith('/api/files/'));
    const request=JSON.parse(calls[2].body);
    assert.equal(request.store,false);
    assert.equal(request.reasoning,undefined, 'Non invia parametri specifici di Luna ad altri modelli');
    const images=request.input[0].content.filter(item=>item.type==='input_image');
    assert.equal(images[0].image_url,'data:image/png;base64,'+png.toString('base64'));
    assert.equal(images[1].image_url,'data:image/png;base64,'+logoBytes.toString('base64'));
    assert.match(calls[1].body.get('prompt'), /zona realmente libera/);
    assert.match(request.input[0].content[0].text, /fondo uniforme bianco o nero del logo deve essere rimosso/);
    assert.ok(request.text.format.schema.required.includes('protected_regions'));
    const log=await latestLog();
    assert.equal(log.prompt_tokens,121); assert.equal(log.output_tokens,32);
    assert.equal(log.text_usage_complete,true); assert.equal(log.text_requests,2);
    assert.equal(log.image_generated,true); assert.deepEqual(log.logo_placement,placement);
    assert.equal(await quota(),1);
  });
  await t.test('Luna limita i consumi del testo e usa Image 2 per la sola grafica', async()=>{
    await setLogo(logo);
    const {ai,calls}=provider(placement,undefined,false,{textModel:'gpt-5.6-luna',imageModel:'gpt-image-2'});
    await ai.generateCopy(user,body);
    assert.equal(calls.length,3, 'Nessuna richiesta aggiuntiva o ripiego su modelli più costosi');
    const copyRequest=JSON.parse(calls[0].body), logoRequest=JSON.parse(calls[2].body);
    for (const request of [copyRequest,logoRequest]) {
      assert.equal(request.model,'gpt-5.6-luna');
      assert.equal(request.service_tier,'default');
      assert.equal(request.store,false);
    }
    assert.equal(copyRequest.reasoning.effort,'none');
    assert.equal(copyRequest.max_output_tokens,1200);
    assert.equal(logoRequest.reasoning.effort,'low');
    assert.equal(logoRequest.max_output_tokens,8000);
    assert.equal(calls[1].body.get('model'),'gpt-image-2');
    assert.equal(calls[1].body.get('size'),'1024x1024');
    assert.equal(calls[1].body.get('n'),'1');
    const log=await latestLog();
    assert.equal(log.model,'gpt-5.6-luna');
    assert.equal(log.image_model,'gpt-image-2');
  });
  await t.test('una risposta interrotta non avvia immagini, tentativi automatici o cambi di modello', async()=>{
    await setLogo(logo);
    const requests=[];
    const ai=createIntegrations(app.db,{...app.config,textModel:'gpt-5.6-luna',imageModel:'gpt-image-2'},async(url,options)=>{
      requests.push({url,request:JSON.parse(options.body)});
      return Response.json({...copy,status:'incomplete',incomplete_details:{reason:'max_output_tokens'},service_tier:'default'});
    });
    await assert.rejects(()=>ai.generateCopy(user,body),error=>error.status===502 && /limite di elaborazione/.test(error.message));
    assert.equal(requests.length,1);
    assert.equal(await quota(),0);
    const log=await latestLog();
    assert.equal(log.status,'error');
    assert.equal(log.ai_calls[0].status,'error');
    assert.equal(log.image_attempted,false);
    assert.equal(log.output_tokens,12, 'Anche la risposta incompleta conserva i consumi comunicati');
  });
  await t.test('il controllo di connessione Luna usa un budget minimo',async()=>{
    const requests=[];
    const ai=createIntegrations(app.db,{...app.config,textModel:'gpt-5.6-luna'},async(url,options)=>{
      requests.push(JSON.parse(options.body));
      return Response.json({output:[{content:[{type:'output_text',text:'ok'}]}],service_tier:'default',usage:{input_tokens:5,output_tokens:1}});
    });
    const result=await ai.aiStatus(user);
    assert.equal(result.ok,true); assert.equal(result.sample,'ok');
    assert.equal(requests.length,1);
    assert.equal(requests[0].reasoning.effort,'none');
    assert.equal(requests[0].max_output_tokens,32);
    assert.equal(requests[0].service_tier,'default');
  });
  await t.test('Original usa una sola chiamata; senza logo Creative non richiede il posizionamento',async()=>{
    await setLogo(logo);
    let run=provider();
    let result=await run.ai.generateCopy(user,{...body,mode:'original'});
    assert.equal(run.calls.length,1); assert.equal(result.logo_url,undefined);
    assert.equal(result.logo_placement,undefined); assert.equal(result.graphic_url,undefined);
    await setLogo('');
    run=provider(); result=await run.ai.generateCopy(user,body);
    assert.equal(run.calls.length,2); assert.equal(result.logo_url,undefined);
  });
  await t.test('un logo altrui o esterno viene rifiutato prima delle chiamate e non consuma quota',async()=>{
    for(const invalid of [otherLogo,'https://example.test/logo.png']) {
      await setLogo(invalid);
      const {ai,calls}=provider();
      await assert.rejects(()=>ai.generateCopy(user,body),error=>[400,404].includes(error.status));
      assert.equal(calls.length,0); assert.equal(await quota(),0);
    }
  });
  await t.test('un layout fuori dalla grafica non viene applicato e la quota è restituita',async()=>{
    await setLogo(logo);
    const {ai}=provider({...placement,x:0.95});
    await assert.rejects(()=>ai.generateCopy(user,body),error=>error.status===502);
    assert.equal(await quota(),0);
    const log=await latestLog();
    assert.equal(log.status,'error'); assert.equal(log.image_generated,true);
    assert.equal(log.prompt_tokens,121); assert.equal(log.text_usage_complete,true);
  });
  await t.test('i consumi parziali restano riconoscibili dopo una risposta senza token o un errore',async()=>{
    for(const failLayout of [false,true]) {
      await setLogo(logo);
      const {ai}=provider(placement,null,failLayout);
      if(failLayout) await assert.rejects(()=>ai.generateCopy(user,body));
      else await ai.generateCopy(user,body);
      const log=await latestLog();
      assert.equal(log.prompt_tokens,41); assert.equal(log.output_tokens,12);
      assert.equal(log.text_usage_complete,false); assert.equal(log.image_generated,true);
      assert.equal(await quota(),failLayout ? 0 : 1);
    }
  });
  await t.test('nessuna zona libera: non applica il logo sui contenuti e restituisce la quota', async()=>{
    await setLogo(logo);
    const {ai}=provider({...placement,protected_regions:[{x:0,y:0,width:1,height:1}]});
    await assert.rejects(()=>ai.generateCopy(user,body),error=>error.status===502 && /spazio libero/.test(error.message));
    assert.equal(await quota(),0);
    assert.equal((await latestLog()).status,'error');
  });
});
