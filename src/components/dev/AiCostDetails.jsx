import { languageLocale } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n';
import { translate as translateUI } from '@/lib/i18n';
import React from 'react';
import { formatAiCost } from '@/lib/aiCosts';

const phases = { copy: 'Testo del post', image: 'Generazione immagine', logo: 'Posizionamento del logo', connection: 'Test di connessione', legacy_text: 'Consumi testo del registro precedente' };

export default function AiCostDetails({ log }) {
  useI18n();
  return <details className="text-xs">
    <summary className="cursor-pointer w-fit py-1 text-muted-foreground underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">{translateUI("Dettaglio costi")}{log.cost?.historical ? translateUI(" · registro precedente") : ''}</summary>
    <div className="py-3 space-y-5">
      {!log.ai_calls?.length && <p>{translateUI("Nessuna richiesta al servizio AI è stata avviata.")}</p>}
      {log.ai_calls?.map((call, index) => <div key={index} className="max-w-xl">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-semibold">{translateUI(phases[call.phase] || call.phase)}</h3>
          <p className="tabular-nums">{translateUI(formatAiCost(call.cost, languageLocale()))}{call.cost?.status === 'partial' ? translateUI(" · subtotale") : ''}</p>
        </div>
        <p className="text-muted-foreground mt-1 break-words">{call.requested_model || translateUI("Modello non registrato")}{call.model && call.model !== call.requested_model ? translateUI(" · versione restituita: ") + call.model : ''}{call.service_tier && !log.cost?.historical ? translateUI(" · servizio ") + (call.service_tier === 'default' ? 'Standard' : call.service_tier) : ''}</p>
        <dl className="mt-2 space-y-1">{call.cost?.lines?.map(line => <div key={line.label} className="flex justify-between gap-4">
          <dt>{translateUI(line.label)} <span className="text-muted-foreground">({line.tokens.toLocaleString(languageLocale())} token)</span></dt>
          <dd className="tabular-nums whitespace-nowrap">{translateUI(formatAiCost(line, languageLocale()))}</dd>
        </div>)}</dl>
        {[...(call.cost?.notes || []), ...(call.cost?.missing || [])].map((note, noteIndex) => <p key={noteIndex} className="mt-2 text-muted-foreground">{translateUI(note)}</p>)}
      </div>)}
      <p className="text-muted-foreground">{translateUI("Stima in USD, esclusi imposte, crediti e accordi commerciali.")}{' '}<a className="underline underline-offset-2" href={log.cost?.source_url || 'https://developers.openai.com/api/docs/pricing'} target="_blank" rel="noreferrer">{translateUI("Tariffe OpenAI")}</a>{log.cost?.verified_at ? translateUI(" verificate il ") + new Date(log.cost.verified_at + 'T12:00:00Z').toLocaleDateString(languageLocale()) : ''}.</p>
    </div>
  </details>;
}
