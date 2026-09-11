import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import AiLogsTable from "@/components/dev/AiLogsTable";
import AiSummaryTable from "@/components/dev/AiSummaryTable";
import { Loader2, ShieldAlert, Activity, Coins, Cpu, Users, SlidersHorizontal } from "lucide-react";
import { isAdminAccount } from "@/lib/adminAccess";
import { aiTokenUsage, formatAiCost, sumAiCosts } from "@/lib/aiCosts";
import WorkspaceHeader from "@/components/WorkspaceHeader";

function SectionCard({ icon: Icon, title, subtitle, children }) {
  return (
    <section className="rounded-[28px] bg-card p-5 sm:p-8 pwa-shadow">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-10 h-10 shrink-0 rounded-xl bg-accent flex items-center justify-center" aria-hidden="true">
          <Icon className="w-5 h-5 text-purple" />
        </span>
        <div>
          <h2 className="font-heading text-lg font-bold leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function PricingTable({ pricing }) {
  const rate = value => value == null ? 'Non applicabile' : '$' + value.toLocaleString('it-IT', { minimumFractionDigits: 2 });
  return <details>
    <summary className="cursor-pointer text-sm font-medium rounded-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-ring">Visualizza le tariffe dei modelli</summary>
    <div className="overflow-x-auto mt-4">
      <table className="w-full text-sm text-left">
        <caption className="text-left text-xs text-muted-foreground mb-3">Dollari per un milione di token. Il prezzo delle immagini dipende dai token effettivamente utilizzati.</caption>
        <thead><tr className="border-b text-xs text-muted-foreground">
          {['Modello / token', 'Input', 'Input in cache', 'Output'].map(label => <th key={label} scope="col" className="font-medium py-2 pr-4">{label}</th>)}
        </tr></thead>
        <tbody>{pricing.models.flatMap(model => {
          const rows = !model.supported ? [{ label: model.model || 'Modello non configurato', input: null, cached: null, output: null }]
            : model.kind === 'responses' ? [{ label: model.model, input: model.rates.input, cached: model.rates.cached_input, output: model.rates.output }]
            : [{ label: model.model + ' · testo', input: model.rates.text_input, cached: model.rates.cached_text_input, output: null },
              { label: model.model + ' · immagine', input: model.rates.image_input, cached: model.rates.cached_image_input, output: model.rates.image_output }];
          return rows.map(row => <tr key={row.label} className="border-b border-border/60">
            <th scope="row" className="font-normal py-3 pr-4">{row.label}</th>
            {!model.supported ? <td colSpan={3} className="text-muted-foreground py-3">Tariffa non disponibile</td> : <>
              <td className="py-3 pr-4 whitespace-nowrap">{rate(row.input)}</td>
              <td className="py-3 pr-4 whitespace-nowrap">{rate(row.cached)}</td>
              <td className="py-3 whitespace-nowrap">{rate(row.output)}</td>
            </>}
          </tr>);
        })}</tbody>
      </table>
    </div>
    <p className="text-xs text-muted-foreground mt-3">Listino Standard verificato il {new Date(pricing.verified_at + 'T12:00:00Z').toLocaleDateString('it-IT')}. Le tariffe sono salvate dal backend con ogni nuova chiamata; non si aggiornano da sole quando cambia il listino OpenAI. <a className="underline underline-offset-2" href={pricing.source_url} target="_blank" rel="noreferrer">Fonte ufficiale OpenAI</a>.</p>
  </details>;
}

export default function Sviluppatore() {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [logs, setLogs] = useState(null);
  const [users, setUsers] = useState([]);
  const [pricing, setPricing] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true); setLoadError('');
    try {
      const [nextLogs, nextUsers, nextPricing] = await Promise.all([
        api.entities.AiLog.list('-created_date', 500), api.entities.User.list(), api.admin.aiPricing(),
      ]);
      setLogs(nextLogs); setUsers(nextUsers); setPricing(nextPricing);
    } catch (error) { setLoadError(error.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { api.auth.me().then(setMe).catch(() => setMe(false)); }, []);
  useEffect(() => { if (isAdminAccount(me)) refresh(); }, [me, refresh]);

  const summary = useMemo(() => {
    const byClient = new Map();
    const usersById = new Map(users.map(user => [user.id, user]));
    const usersByEmail = new Map(users.map(user => [String(user.email).toLowerCase(), user]));
    let totalTokens = 0, incompleteTokens = 0;
    for (const log of logs || []) {
      const usage = aiTokenUsage(log);
      totalTokens += usage.value || 0;
      if (!usage.complete) incompleteTokens++;
      const key = log.user_id || String(log.user_email || 'sconosciuto').toLowerCase();
      const user = usersById.get(log.user_id) || usersByEmail.get(String(log.user_email).toLowerCase());
      const row = byClient.get(key) || { id: key, email: user?.email || log.user_email || 'Utente non registrato',
        company: user?.company_name || log.company_name || '', plan: user?.plan || '—', calls: 0, tokens: 0, incompleteTokens: 0, costs: [] };
      row.calls++; row.tokens += usage.value || 0;
      if (!usage.complete) row.incompleteTokens++;
      row.costs.push(log.cost);
      byClient.set(key, row);
    }
    const rows = [...byClient.values()].map(row => ({ ...row, cost: sumAiCosts(row.costs) }));
    rows.sort((a, b) => (b.cost.max_usd || 0) - (a.cost.max_usd || 0));
    return { rows, totalCalls: logs?.length || 0, totalTokens, incompleteTokens,
      cost: sumAiCosts((logs || []).map(log => log.cost)), activeClients: rows.length };
  }, [logs, users]);

  if (me === null) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" aria-label="Caricamento" /></div>;
  if (!isAdminAccount(me)) return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <div className="text-center max-w-sm">
        <ShieldAlert className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
        <h1 className="font-heading text-xl font-bold mb-2">Area sviluppatore</h1>
        <p className="text-sm text-muted-foreground mb-6">Accesso riservato esclusivamente allo sviluppatore.</p>
        <Button onClick={() => navigate('/studio')} className="rounded-full">Torna allo Studio</Button>
      </div>
    </div>
  );

  const pending = loadError ? 'Non disponibile' : '…';
  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader subtitle="Sviluppatore" showGuide={false} />
      <main className="workspace-main space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="workspace-title">Sviluppatore</h1>
          <Button variant="outline" onClick={refresh} disabled={loading}>{loading ? 'Aggiornamento…' : 'Aggiorna consumi'}</Button>
        </div>
        {loadError && <p role="alert" className="text-sm text-destructive">Aggiornamento non riuscito: {loadError}. {logs !== null && 'Sono mostrati i dati dell’ultimo caricamento.'}</p>}
        <p className="text-sm text-muted-foreground">Consumi delle ultime 500 operazioni registrate in questa app. Ogni generazione può comprendere testo, immagine e posizionamento del logo. Le stime in dollari non rappresentano la fattura OpenAI.</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="rounded-[24px] bg-card p-4 sm:p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2"><Activity className="w-4 h-4 shrink-0" /> Operazioni AI</div>
            <strong className="font-heading text-3xl">{logs === null ? pending : summary.totalCalls}</strong>
          </div>
          <div className="rounded-[24px] bg-card p-4 sm:p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2"><Cpu className="w-4 h-4 shrink-0" /> Token riportati</div>
            <strong className="font-heading text-3xl">{logs === null ? pending : summary.totalTokens.toLocaleString('it-IT')}</strong>
            <p className="text-xs text-muted-foreground mt-1">Testo e immagini{summary.incompleteTokens > 0 ? ' · dati parziali' : ''}</p>
          </div>
          <div className="rounded-[24px] bg-card p-4 sm:p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2"><Coins className="w-4 h-4 shrink-0" /> {summary.cost.status === 'partial' ? 'Subtotale stimato' : 'Spesa stimata'}</div>
            <strong className="font-heading text-lg [overflow-wrap:anywhere]">{logs === null ? pending : formatAiCost(summary.cost)}</strong>
            <p className="text-xs text-muted-foreground mt-1">USD{summary.cost.incomplete_count > 0 ? ' · ' + summary.cost.incomplete_count + (summary.cost.incomplete_count === 1 ? ' operazione con costi incompleti' : ' operazioni con costi incompleti') : ' · consumi registrati'}</p>
          </div>
          <div className="rounded-[24px] bg-card p-4 sm:p-6 pwa-shadow">
            <div className="flex items-center gap-2 text-muted-foreground text-xs font-medium mb-2"><Users className="w-4 h-4 shrink-0" /> Clienti attivi AI</div>
            <strong className="font-heading text-3xl">{logs === null ? pending : summary.activeClients}</strong>
          </div>
        </div>
        {logs?.some(log => log.cost?.min_usd !== log.cost?.max_usd || log.cost?.status !== 'complete') && <p className="text-xs text-muted-foreground">Un intervallo indica che lo sconto cache non è stato comunicato. «Subtotale» comprende solo i consumi stimabili: le voci mancanti non sono considerate gratuite. Apri il dettaglio di un’operazione per vedere il motivo.</p>}
        <SectionCard icon={Coins} title="Spesa per cliente" subtitle="Totale delle operazioni visibili nello storico, inclusi i test di connessione e le chiamate fallite con consumi riportati.">
          {logs === null ? <p className="text-sm text-muted-foreground" role="status">{loading ? 'Caricamento dei consumi…' : pending}</p> : <AiSummaryTable rows={summary.rows} />}
        </SectionCard>
        <SectionCard icon={Activity} title="Storico chiamate AI" subtitle="Costo per generazione, con le singole voci di testo, immagine e analisi del logo.">
          {logs === null ? <p className="text-sm text-muted-foreground" role="status">{loading ? 'Caricamento dello storico…' : pending}</p> : <AiLogsTable logs={logs} />}
        </SectionCard>
        <SectionCard icon={SlidersHorizontal} title="Tariffe automatiche" subtitle="Il calcolo è condiviso tra i browser e non richiede prezzi medi inseriti a mano.">
          {pricing ? <PricingTable pricing={pricing} /> : <p className="text-sm text-muted-foreground">{loading ? 'Caricamento delle tariffe…' : pending}</p>}
        </SectionCard>
      </main>
    </div>
  );
}
