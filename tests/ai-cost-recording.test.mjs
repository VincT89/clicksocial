import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { createApp } from '../server/app.mjs';
import { createIntegrations } from '../server/integrations.mjs';
import { now, uid } from '../server/store.mjs';
import { saveImage } from '../server/files.mjs';
import { testDatabase } from './helpers/database.mjs';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl6kHcAAAAASUVORK5CYII=','base64');
const placement = {x:0.72,y:0.07,width:0.2,height:0.12,background:'none',logo_background:'none',protected_regions:[]};
const response = (value,input,output,cached=0) => ({model:'chat-latest',service_tier:'default',output:[{content:[{type:'output_text',text:JSON.stringify(value)}]}],
  usage:{input_tokens:input,output_tokens:output,total_tokens:input+output,input_tokens_details:{cached_tokens:cached}}});

test('Registrazione costi: persistenza di testo, immagine, logo e chiamate fallite', async t => {
  mkdirSync(resolve('work/tests'),{recursive:true});
  const app = await createApp({...await testDatabase(),dataDir:mkdtempSync(resolve('work/tests/ai-cost-')),
    localMode:true,scheduler:false,openaiKey:'test-only',textModel:'chat-latest',imageModel:'gpt-image-2',
    fetchImpl:async()=>{throw new Error('Nessuna rete reale nei test');}});
  t.after(()=>app.close());
  const user={id:uid(),email:'cost-fixture@example.test',role:'admin'};
  await app.db.prepare("INSERT INTO users(id,email,verified,role,plan,profile,created_at) VALUES(?,?,1,'admin','pro','{}',?)").run(user.id,user.email,now());
  const photo=(await saveImage(app.db,app.config,user,png,'foto.png')).file_url;
  await app.db.prepare('UPDATE users SET profile=? WHERE id=?').run(JSON.stringify({company_logo_url:photo}),user.id);
  const latest=async()=>JSON.parse((await app.db.prepare('SELECT data FROM ai_logs WHERE user_id=? ORDER BY created_at DESC').get(user.id)).data);
  const prepare = (imageFailure=false,invalidLayout=false) => {
    const ai = createIntegrations(app.db,app.config,async(url,options)=>{
      if (url.endsWith('/images/edits')) return imageFailure ? Response.json({error:{message:'Errore immagine di prova'}},{status:502})
        : Response.json({data:[{b64_json:png.toString('base64')}],usage:{input_tokens:500,input_tokens_details:{text_tokens:100,image_tokens:400},output_tokens:1000,total_tokens:1500}});
      const body=JSON.parse(options.body);
      assert.equal(body.service_tier,'default'); assert.equal(body.store,false);
      return Response.json(body.text.format.name==='social_copy' ? response({headline:'Titolo',caption:'Caption',hashtags:'#test'},1000,100,200)
        : response(invalidLayout ? {...placement,x:0.95} : placement,500,50));
    });
    return ai;
  };
  await t.test('una generazione salva tre fasi e lo snapshot del prezzo',async()=>{
    await prepare().generateCopy(user,{file_url:photo,mode:'creative'});
    const log=await latest();
    assert.deepEqual(log.ai_calls.map(call=>call.phase),['copy','image','logo']);
    assert.equal(log.ai_calls[1].usage.output_tokens,1000);
    assert.equal(log.ai_calls[0].usage.input_tokens_details.cached_tokens,200);
    assert.equal(log.cost.status,'complete'); assert.equal(log.cost.min_usd,0.042025); assert.equal(log.cost.max_usd,0.0448);
    assert.equal(log.ai_calls[0].cost.rates.input,5); assert.equal(log.ai_calls[1].cost.rates.image_input,8);
    assert.ok(!JSON.stringify(log).includes('b64_json')); assert.ok(!JSON.stringify(log).includes('test-only'));
  });
  await t.test('immagine fallita: il costo del testo resta nel subtotale',async()=>{
    await assert.rejects(()=>prepare(true).generateCopy(user,{file_url:photo,mode:'enhance'}));
    const log=await latest();
    assert.equal(log.status,'error'); assert.equal(log.cost.status,'partial'); assert.equal(log.cost.max_usd,0.0071);
    assert.equal(log.ai_calls.length,2); assert.equal(log.ai_calls[1].usage,null);
  });
  await t.test('layout non valido: i consumi già comunicati restano tutti conteggiati',async()=>{
    await assert.rejects(()=>prepare(false,true).generateCopy(user,{file_url:photo,mode:'creative'}));
    const log=await latest();
    assert.equal(log.status,'error'); assert.equal(log.cost.status,'complete'); assert.equal(log.cost.max_usd,0.0448);
  });
  await t.test('test di connessione: successi ed errori sono registrati; consumi mancanti non diventano zero',async()=>{
    const success=createIntegrations(app.db,app.config,async()=>Response.json(response('ok',10,1)));
    await success.aiStatus(user);
    let log=await latest();
    assert.equal(log.ai_calls[0].phase,'connection'); assert.equal(log.cost.max_usd,0.00008);
    const failure=createIntegrations(app.db,app.config,async()=>Response.json({error:{message:'Errore di prova'}},{status:500}));
    await assert.rejects(()=>failure.aiStatus(user));
    log=await latest();
    assert.equal(log.operation,'aiStatus'); assert.equal(log.status,'error'); assert.equal(log.cost.max_usd,null);
    assert.equal(log.prompt_tokens,null); assert.equal(log.output_tokens,null);
  });
});
