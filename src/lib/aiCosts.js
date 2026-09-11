const money = value => Math.round(value * 1e12) / 1e12;
const amount = value => Number.isFinite(value) && value >= 0;
const tokens = value => Number.isSafeInteger(value) && value >= 0;

// Somma solo le voci misurate, senza trasformare un costo mancante in zero.
export function sumAiCosts(costs) {
  const known = costs.filter(cost => amount(cost?.min_usd) && amount(cost?.max_usd) && cost.max_usd >= cost.min_usd);
  const incomplete = costs.filter(cost => cost?.status !== 'complete' || !known.includes(cost)).length;
  return {
    currency: 'USD',
    status: !costs.length || !incomplete ? 'complete' : known.length ? 'partial' : 'unavailable',
    min_usd: known.length || !costs.length ? money(known.reduce((sum, cost) => sum + cost.min_usd, 0)) : null,
    max_usd: known.length || !costs.length ? money(known.reduce((sum, cost) => sum + cost.max_usd, 0)) : null,
    incomplete_count: incomplete,
  };
}

export function formatAiCost(cost) {
  if (!amount(cost?.min_usd) || !amount(cost?.max_usd)) return 'Non disponibile';
  const format = value => new Intl.NumberFormat('it-IT', { minimumFractionDigits: 4, maximumFractionDigits: 6 }).format(value);
  if (cost.min_usd === cost.max_usd) return cost.max_usd > 0 && cost.max_usd < 0.000001 ? '< $0,000001' : '$' + format(cost.max_usd);
  return '$' + format(cost.min_usd) + '–' + format(cost.max_usd);
}

export function aiTokenUsage(log) {
  const usages = Array.isArray(log.ai_calls) ? log.ai_calls.map(call => call.usage)
    : [{ input_tokens: log.prompt_tokens, output_tokens: log.output_tokens }];
  const values = usages.flatMap(usage => [usage?.input_tokens, usage?.output_tokens]);
  const known = values.filter(tokens);
  return {
    value: known.length || !values.length ? known.reduce((sum, value) => sum + value, 0) : null,
    complete: known.length === values.length && (!values.length || log.text_usage_complete !== false) &&
      (Array.isArray(log.ai_calls) || !log.image_attempted && !log.image_generated),
  };
}
