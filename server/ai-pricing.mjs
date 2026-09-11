import { sumAiCosts } from '../src/lib/aiCosts.js';

// Tariffe Standard verificate sulle pagine ufficiali. Non sono tariffe Batch.
export const AI_PRICE_VERSION = 'openai-standard-2026-09-11';
export const AI_PRICE_DATE = '2026-09-11';
export const AI_PRICE_SOURCE = 'https://developers.openai.com/api/docs/pricing';
const catalog = [
  { models: ['gpt-5.6-luna'], kind: 'responses', rates: { input: 0.2, cached_input: 0.02, output: 1.2 },
    long_context: { above: 272000, input_multiplier: 2, output_multiplier: 1.5 },
    source_url: 'https://developers.openai.com/api/docs/models/gpt-5.6-luna' },
  { models: ['chat-latest'], kind: 'responses', rates: { input: 5, cached_input: 0.5, output: 30 },
    source_url: 'https://developers.openai.com/api/docs/models/chat-latest' },
  { models: ['gpt-image-2', 'gpt-image-2-2026-04-21'], kind: 'images',
    rates: { text_input: 5, cached_text_input: 1.25, image_input: 8, cached_image_input: 2, image_output: 30 },
    source_url: AI_PRICE_SOURCE },
];
const validTokens = value => Number.isSafeInteger(value) && value >= 0;
const round = value => Math.round(value * 1e12) / 1e12;
const tariffFor = (model, kind) => catalog.find(price => price.kind === kind && price.models.includes(model));

export function aiPricingSettings(config) {
  return { currency: 'USD', version: AI_PRICE_VERSION, verified_at: AI_PRICE_DATE, source_url: AI_PRICE_SOURCE,
    models: [['responses', config.textModel], ['images', config.imageModel]].map(([kind, model]) => {
      const price = tariffFor(model, kind);
      return { kind, model, supported: !!price, rates: price?.rates || null, source_url: price?.source_url || AI_PRICE_SOURCE };
    }),
  };
}

// Conserva solo consumi e metadati: mai prompt, immagini, credenziali o risposte testuali.
export function aiResponseMetadata(response) {
  const numeric = (object, fields) => Object.fromEntries(fields.filter(key => Object.hasOwn(object || {}, key))
    .map(key => [key, typeof object[key] === 'number' ? object[key] : null]));
  const usage = response?.usage;
  return {
    model: typeof response?.model === 'string' ? response.model : null,
    response_id: typeof response?.id === 'string' ? response.id : null,
    service_tier: typeof response?.service_tier === 'string' ? response.service_tier : null,
    usage: usage && typeof usage === 'object' ? {
      ...numeric(usage, ['input_tokens', 'output_tokens', 'total_tokens']),
      input_tokens_details: numeric(usage.input_tokens_details, ['cached_tokens', 'cache_write_tokens', 'text_tokens', 'image_tokens']),
      output_tokens_details: numeric(usage.output_tokens_details, ['reasoning_tokens', 'image_tokens', 'text_tokens']),
    } : null,
  };
}

export function estimateAiCall(call) {
  const tariff = tariffFor(call.requested_model, call.kind);
  const cost = { schema_version: 1, currency: 'USD', price_version: AI_PRICE_VERSION, verified_at: AI_PRICE_DATE,
    source_url: tariff?.source_url || AI_PRICE_SOURCE, rates: tariff ? { ...tariff.rates } : null,
    lines: [], notes: [], missing: [] };
  const missing = message => cost.missing.push(message);
  const line = (label, count, minimum, maximum = minimum) => {
    if (!validTokens(count)) { missing('Consumo non comunicato o non valido: ' + label.toLowerCase() + '.'); return; }
    cost.lines.push({ label, tokens: count, rate_min: minimum, rate_max: maximum,
      min_usd: round(count * minimum / 1e6), max_usd: round(count * maximum / 1e6) });
  };
  const finish = () => ({ ...cost, status: cost.missing.length ? cost.lines.length ? 'partial' : 'unavailable' : 'complete',
    min_usd: cost.lines.length ? round(cost.lines.reduce((sum, item) => sum + item.min_usd, 0)) : null,
    max_usd: cost.lines.length ? round(cost.lines.reduce((sum, item) => sum + item.max_usd, 0)) : null });
  if (!tariff) { missing('Tariffa non disponibile per il modello ' + (call.requested_model || 'non registrato') + '.'); return finish(); }
  // Images Edits è una richiesta sincrona Standard; Responses riporta il livello effettivo.
  if (call.kind === 'responses' && call.service_tier !== 'default' || call.kind === 'images' && call.service_tier && call.service_tier !== 'default') {
    missing(call.service_tier ? 'Tariffa non disponibile per il livello di servizio ' + call.service_tier + '.' : 'Livello di servizio non comunicato dall’API.');
    return finish();
  }
  const usage = call.usage;
  if (!usage) { missing('Consumi non restituiti dall’API.'); return finish(); }
  if (validTokens(usage.input_tokens) && validTokens(usage.output_tokens) && Object.hasOwn(usage, 'total_tokens') &&
    (!validTokens(usage.total_tokens) || usage.total_tokens !== usage.input_tokens + usage.output_tokens)) {
    missing('Totale dei token incoerente con i consumi comunicati.'); return finish();
  }
  const input = usage.input_tokens_details || {}, output = usage.output_tokens_details || {}, rates = cost.rates;
  if (tariff.long_context && usage.input_tokens > tariff.long_context.above) {
    rates.input = round(rates.input * tariff.long_context.input_multiplier);
    rates.cached_input = round(rates.cached_input * tariff.long_context.input_multiplier);
    rates.output = round(rates.output * tariff.long_context.output_multiplier);
    cost.notes.push('Applicata la tariffa per richieste oltre ' + tariff.long_context.above + ' token di input.');
  }
  if (call.kind === 'responses') {
    if (Object.hasOwn(input, 'cached_tokens')) {
      if (validTokens(input.cached_tokens) && validTokens(usage.input_tokens) && input.cached_tokens <= usage.input_tokens) {
        line('Input senza cache', usage.input_tokens - input.cached_tokens, rates.input);
        line('Input in cache', input.cached_tokens, rates.cached_input);
      } else missing('Dettaglio dei token in cache non valido.');
    } else {
      line('Input, cache non comunicata', usage.input_tokens, rates.cached_input, rates.input);
      if (usage.input_tokens > 0) cost.notes.push('L’intervallo considera l’input con e senza lo sconto cache.');
    }
    // I reasoning token sono già compresi in output_tokens.
    line('Output testo', usage.output_tokens, rates.output);
    if (input.cache_write_tokens > 0) missing('Eventuali supplementi per scrittura della cache non sono inclusi.');
  } else {
    if (validTokens(input.text_tokens) && validTokens(input.image_tokens) && validTokens(usage.input_tokens) &&
      input.text_tokens + input.image_tokens !== usage.input_tokens) missing('Ripartizione dei token di input incoerente.');
    else {
      // Lo schema Images Edits non comunica la ripartizione della cache per modalità.
      line('Input testo, cache non comunicata', input.text_tokens, rates.cached_text_input, rates.text_input);
      line('Input immagine, cache non comunicata', input.image_tokens, rates.cached_image_input, rates.image_input);
      if (input.text_tokens > 0 || input.image_tokens > 0) cost.notes.push('La cache delle immagini non è distinta dall’API: è mostrato un intervallo, dallo sconto massimo alla tariffa piena.');
    }
    if (Object.hasOwn(output, 'image_tokens')) {
      if (validTokens(output.image_tokens) && (!validTokens(usage.output_tokens) || output.image_tokens <= usage.output_tokens))
        line('Output immagine', output.image_tokens, rates.image_output);
      else missing('Ripartizione dei token di output non valida.');
    } else line('Output immagine', usage.output_tokens, rates.image_output);
  }
  return finish();
}

export function pricedAiLog(log, calls) {
  const ai_calls = calls.map(call => ({ ...call, cost: estimateAiCall(call) }));
  return { ...log, ai_calls, cost: { schema_version: 1, ...sumAiCosts(ai_calls.map(call => call.cost)),
    price_version: AI_PRICE_VERSION, verified_at: AI_PRICE_DATE, source_url: AI_PRICE_SOURCE } };
}

export function withAiCosts(log) {
  // Le nuove stime sono salvate insieme ai consumi: nessun ricalcolo con tariffe future.
  if (log.cost?.schema_version === 1 && Array.isArray(log.ai_calls)) return log;
  const calls = [{ phase: 'legacy_text', kind: 'responses', requested_model: log.model, model: log.model,
    service_tier: 'default', usage: { input_tokens: log.prompt_tokens, output_tokens: log.output_tokens } }];
  if (log.image_attempted || log.image_generated) calls.push({ phase: 'image', kind: 'images', requested_model: log.image_model, usage: null });
  const result = pricedAiLog(log, calls);
  for (const call of result.ai_calls) {
    call.cost.missing = call.cost.missing.map(message => message === 'Consumi non restituiti dall’API.' ? 'Consumi non registrati nello storico precedente.' : message);
    call.cost.notes.push('Ricostruzione storica alle tariffe Standard del ' + AI_PRICE_DATE + '; il livello di servizio originale non era registrato.');
    call.cost.missing.push('Il registro precedente non permette di verificare tutte le voci di costo.');
    if (call.cost.status === 'complete') call.cost.status = 'partial';
  }
  result.cost = { ...result.cost, ...sumAiCosts(result.ai_calls.map(call => call.cost)), historical: true };
  return result;
}
