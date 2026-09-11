import React from 'react';
import { formatAiCost } from '@/lib/aiCosts';

const phases = { copy: 'Testo del post', image: 'Generazione immagine', logo: 'Posizionamento del logo', connection: 'Test di connessione', legacy_text: 'Consumi testo del registro precedente' };

export default function AiCostDetails({ log }) {
  return <details className="text-xs">
    <summary className="cursor-pointer w-fit py-1 text-muted-foreground underline underline-offset-2 rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Dettaglio costi{log.cost?.historical ? ' · registro precedente' : ''}</summary>
    <div className="py-3 space-y-5">
      {!log.ai_calls?.length && <p>Nessuna richiesta al servizio AI è stata avviata.</p>}
      {log.ai_calls?.map((call, index) => <div key={index} className="max-w-xl">
        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <h3 className="font-semibold">{phases[call.phase] || call.phase}</h3>
          <p className="tabular-nums">{formatAiCost(call.cost)}{call.cost?.status === 'partial' ? ' · subtotale' : ''}</p>
        </div>
        <p className="text-muted-foreground mt-1 break-words">{call.requested_model || 'Modello non registrato'}{call.model && call.model !== call.requested_model ? ' · versione restituita: ' + call.model : ''}{call.service_tier && !log.cost?.historical ? ' · servizio ' + (call.service_tier === 'default' ? 'Standard' : call.service_tier) : ''}</p>
        <dl className="mt-2 space-y-1">{call.cost?.lines?.map(line => <div key={line.label} className="flex justify-between gap-4">
          <dt>{line.label} <span className="text-muted-foreground">({line.tokens.toLocaleString('it-IT')} token)</span></dt>
          <dd className="tabular-nums whitespace-nowrap">{formatAiCost(line)}</dd>
        </div>)}</dl>
        {[...(call.cost?.notes || []), ...(call.cost?.missing || [])].map((note, noteIndex) => <p key={noteIndex} className="mt-2 text-muted-foreground">{note}</p>)}
      </div>)}
      <p className="text-muted-foreground">Stima in USD, esclusi imposte, crediti e accordi commerciali. <a className="underline underline-offset-2" href={log.cost?.source_url || 'https://developers.openai.com/api/docs/pricing'} target="_blank" rel="noreferrer">Tariffe OpenAI</a>{log.cost?.verified_at ? ' verificate il ' + new Date(log.cost.verified_at + 'T12:00:00Z').toLocaleDateString('it-IT') : ''}.</p>
    </div>
  </details>;
}
