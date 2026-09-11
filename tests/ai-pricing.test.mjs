import test from 'node:test';
import assert from 'node:assert/strict';
import { estimateAiCall, pricedAiLog, withAiCosts, aiResponseMetadata, aiPricingSettings } from '../server/ai-pricing.mjs';
import { sumAiCosts, aiTokenUsage, formatAiCost } from '../src/lib/aiCosts.js';

const textCall = usage => ({ phase:'copy', kind:'responses', requested_model:'chat-latest', service_tier:'default', usage });
const textUsage = { input_tokens:1000, input_tokens_details:{cached_tokens:200}, output_tokens:100, output_tokens_details:{reasoning_tokens:40}, total_tokens:1100 };
const imageCall = usage => ({ phase:'image', kind:'images', requested_model:'gpt-image-2', usage });
const imageUsage = { input_tokens:500, input_tokens_details:{text_tokens:100,image_tokens:400}, output_tokens:1000, total_tokens:1500 };

test('Tariffe Standard: input, cache e output distinti; reasoning già incluso', () => {
  const result = estimateAiCall(textCall(textUsage));
  assert.equal(result.status,'complete');
  assert.equal(result.min_usd,0.0071); assert.equal(result.max_usd,0.0071);
  assert.deepEqual(result.lines.map(line=>line.tokens),[800,200,100]);
  assert.equal(result.rates.cached_input,0.5);
});

test('Luna: tariffa economica corretta, cache distinta e Image 2 riconosciuto', () => {
  const result = estimateAiCall({...textCall(textUsage),requested_model:'gpt-5.6-luna'});
  assert.equal(result.status,'complete');
  assert.equal(result.min_usd,0.000284); assert.equal(result.max_usd,0.000284);
  assert.equal(result.rates.input,0.2); assert.equal(result.rates.cached_input,0.02); assert.equal(result.rates.output,1.2);
  assert.equal(aiPricingSettings({textModel:'gpt-5.6-luna',imageModel:'gpt-image-2'}).models.every(model=>model.supported),true);
});

test('Luna: il sovrapprezzo dei contesti lunghi non modifica il listino delle richieste successive', () => {
  const long = estimateAiCall({...textCall({...textUsage,input_tokens:272001,total_tokens:272101}),requested_model:'gpt-5.6-luna'});
  assert.equal(long.status,'complete'); assert.equal(long.max_usd,0.1089084);
  assert.equal(long.rates.input,0.4); assert.equal(long.rates.cached_input,0.04); assert.equal(long.rates.output,1.8);
  const normal = estimateAiCall({...textCall(textUsage),requested_model:'gpt-5.6-luna'});
  assert.equal(normal.max_usd,0.000284); assert.equal(normal.rates.input,0.2);
});

test('Images Edits: intervallo sulla cache non comunicata e tariffa Standard, non Batch', () => {
  const result = estimateAiCall(imageCall(imageUsage));
  assert.equal(result.status,'complete');
  assert.equal(result.min_usd,0.030925); assert.equal(result.max_usd,0.0337);
  assert.equal(result.rates.image_input,8); assert.equal(result.rates.image_output,30);
  assert.match(result.notes.join(' '),/cache/);
  const detailed = estimateAiCall(imageCall({...imageUsage,output_tokens:1010,total_tokens:1510,output_tokens_details:{image_tokens:1000,text_tokens:10}}));
  assert.equal(detailed.max_usd,result.max_usd, 'L’output testo del modello immagini non è fatturato');
});

test('Cache assente: intervallo esplicito, non zero inventato; zero riportato resta zero', () => {
  const result = estimateAiCall(textCall({input_tokens:1000,output_tokens:100}));
  assert.equal(result.min_usd,0.0035); assert.equal(result.max_usd,0.008);
  const zero = estimateAiCall(textCall({input_tokens:0,output_tokens:0}));
  assert.equal(zero.status,'complete'); assert.equal(zero.max_usd,0);
  assert.equal(estimateAiCall(textCall(null)).max_usd,null);
});

test('Tariffe e livelli sconosciuti non vengono sostituiti con un modello simile', () => {
  for (const call of [ {...textCall(textUsage),requested_model:'chat-latest-invented'},
    {...imageCall(imageUsage),requested_model:'gpt-image-2-new'}, {...textCall(textUsage),service_tier:'priority'},
    {...textCall(textUsage),service_tier:null} ]) {
    const result = estimateAiCall(call);
    assert.equal(result.status,'unavailable'); assert.equal(result.min_usd,null); assert.ok(result.missing.length);
  }
  assert.equal(aiPricingSettings({textModel:'chat-latest',imageModel:'gpt-image-2-2026-04-21'}).models.every(model=>model.supported),true);
});

test('Token invalidi o incoerenti: nessun importo negativo, NaN o input contato due volte', () => {
  for (const invalid of [-1,NaN,Infinity,'100',1.5,null]) {
    const result = estimateAiCall(textCall({input_tokens:invalid,output_tokens:100}));
    assert.equal(result.status,'partial'); assert.equal(result.max_usd,0.003);
  }
  const badCache = estimateAiCall(textCall({...textUsage,input_tokens_details:{cached_tokens:1001}}));
  assert.equal(badCache.status,'partial'); assert.equal(badCache.max_usd,0.003);
  const badTotal = estimateAiCall(textCall({...textUsage,total_tokens:1101}));
  assert.equal(badTotal.status,'unavailable'); assert.equal(badTotal.max_usd,null);
  const badImage = estimateAiCall(imageCall({...imageUsage,input_tokens_details:{text_tokens:101,image_tokens:400}}));
  assert.equal(badImage.status,'partial'); assert.equal(badImage.max_usd,0.03);
  const noBreakdown = estimateAiCall(imageCall({...imageUsage,input_tokens_details:{}}));
  assert.equal(noBreakdown.status,'partial'); assert.equal(noBreakdown.max_usd,0.03);
});

test('Una fase senza consumi non cancella i costi già misurati; totali parziali per cliente', () => {
  const log = pricedAiLog({status:'error'},[textCall(textUsage),imageCall(null)]);
  assert.equal(log.cost.status,'partial'); assert.equal(log.cost.min_usd,0.0071);
  assert.equal(log.ai_calls[1].cost.status,'unavailable');
  const total = sumAiCosts([log.cost,pricedAiLog({},[textCall(textUsage)]).cost]);
  assert.equal(total.status,'partial'); assert.equal(total.max_usd,0.0142); assert.equal(total.incomplete_count,1);
  assert.equal(sumAiCosts([undefined]).max_usd,null);
  assert.equal(sumAiCosts([]).max_usd,0);
});

test('Log precedenti: stima storica parziale e nessuna ricostruzione dei token immagine mancanti', () => {
  const legacy = { model:'chat-latest',prompt_tokens:1000,output_tokens:100,image_model:'gpt-image-2',image_generated:true };
  const result = withAiCosts(legacy);
  assert.equal(result.cost.status,'partial'); assert.equal(result.cost.historical,true);
  assert.equal(result.cost.min_usd,0.0035); assert.equal(result.cost.max_usd,0.008);
  assert.equal(result.ai_calls[1].cost.max_usd,null);
  assert.ok(result.ai_calls[1].cost.missing.includes('Consumi non registrati nello storico precedente.'));
  assert.equal(legacy.cost,undefined, 'La lettura non modifica il registro originale');
  assert.equal(aiTokenUsage(withAiCosts({...legacy,image_generated:false,text_usage_complete:false})).complete,false);
});

test('Snapshot salvato: una lettura non ricalcola il costo al listino corrente', () => {
  const stored = pricedAiLog({},[textCall(textUsage)]);
  stored.cost.price_version='listino-precedente-di-prova'; stored.cost.max_usd=0.1;
  assert.strictEqual(withAiCosts(stored),stored);
  assert.equal(withAiCosts(stored).cost.max_usd,0.1);
});

test('Metadati e conteggio includono testo, immagine e logo senza conservare i contenuti', () => {
  const result = aiResponseMetadata({model:'chat-latest',service_tier:'default',id:'resp-test',usage:{...textUsage,secret:'non salvare'},output:[{text:'non salvare'}],api_key:'non salvare'});
  assert.equal(result.usage.input_tokens_details.cached_tokens,200);
  assert.ok(!JSON.stringify(result).includes('non salvare'));
  const log = pricedAiLog({},[textCall(textUsage),imageCall(imageUsage),{...textCall({input_tokens:500,output_tokens:50}),phase:'logo'}]);
  assert.deepEqual(aiTokenUsage(log),{value:3150,complete:true});
  assert.deepEqual(aiTokenUsage(pricedAiLog({},[textCall(textUsage),imageCall(null)])),{value:1100,complete:false});
  assert.equal(formatAiCost({min_usd:0.0000005,max_usd:0.0000005}),'< $0,000001');
});
