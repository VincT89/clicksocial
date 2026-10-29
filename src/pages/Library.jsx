import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api/client';
import { copyText } from '@/lib/mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import ScheduleDialog from '@/components/library/ScheduleDialog';
import PlanDialog from '@/components/library/PlanDialog';
import PlanningDraftDialog from '@/components/library/PlanningDraftDialog';
import EditorialCalendar from '@/components/library/EditorialCalendar';
import EditorialPost from '@/components/library/EditorialPost';
import ConfirmAction from '@/components/ConfirmAction';
import { toast } from 'sonner';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { dayKey, moveMonth, editorialDate, editorialStage, STAGES, PLATFORMS } from '@/lib/editorialDates.mjs';

export default function Library() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => moveMonth(new Date(),0));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [stage, setStage] = useState('');
  const [view, setView] = useState(() => window.matchMedia('(max-width: 767px)').matches ? 'agenda' : 'calendar');
  const [showFilters, setShowFilters] = useState(false);
  const [plan, setPlan] = useState(null);
  const [draft, setDraft] = useState(null);
  const [schedule, setSchedule] = useState(null);
  const [action, setAction] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const revision = useRef(0);
  const load = useCallback(async () => {
    const current = ++revision.current;
    setRefreshing(true);
    try { const data = await api.entities.Post.list(); if (current === revision.current) { setPosts(data); setError(''); } }
    catch (e) { if (current === revision.current) setError(e.message); }
    finally { if (current === revision.current) setRefreshing(false); }
  }, []);
  useEffect(() => {
    load();
    const visible = () => { if (!document.hidden) load(); };
    document.addEventListener('visibilitychange',visible);
    return () => { revision.current++; document.removeEventListener('visibilitychange',visible); };
  }, [load]);
  const pending = posts?.some(p => ['in_coda','in_pubblicazione'].includes(p.status));
  useEffect(() => {
    if (!pending) return;
    const interval = setInterval(() => { if (!document.hidden) load(); },30000);
    return () => clearInterval(interval);
  }, [pending,load]);
  const filtered = useMemo(() => (posts || []).filter(p => (!platform || p.platform === platform) && (!stage || editorialStage(p) === stage) && (!search.trim() || [p.title,p.headline,p.caption,p.hashtags,p.editorial_notes,p.planning?.topic,p.planning?.objective,p.planning?.shots,p.planning?.notes,p.planning?.provisional_copy].some(value => String(value || '').toLocaleLowerCase('it-IT').includes(search.trim().toLocaleLowerCase('it-IT'))))), [posts,platform,stage,search]);
  const byDay = useMemo(() => {
    const result = new Map();
    [...filtered].sort((a,b) => String(editorialDate(a) || '').localeCompare(String(editorialDate(b) || ''))).forEach(post => {
      const date = editorialDate(post); if (!date) return;
      const key = dayKey(date); if (!result.has(key)) result.set(key,[]); result.get(key).push(post);
    }); return result;
  }, [filtered]);
  const unscheduled = filtered.filter(p => !editorialDate(p));
  const agenda = [...byDay.entries()].sort(([a], [b]) => a.localeCompare(b));
  const update = saved => {
    setPosts(current => (current || []).some(p => p.id === saved.id) ? current.map(p => p.id === saved.id ? saved : p) : [saved, ...(current || [])]);
    if (editorialDate(saved)) { const date = new Date(editorialDate(saved)); setSelected(dayKey(date)); setMonth(moveMonth(date,0)); }
  };
  const confirm = async () => {
    if (!action || busy) return;
    setBusy(true);
    try {
      if (action.type === 'delete') { await api.entities.Post.delete(action.post.id); setPosts(current => current.filter(p => p.id !== action.post.id)); toast.success('Post eliminato'); }
      if (action.type === 'cancel') { update(await api.editorial.cancelSchedule(action.post.id)); toast.success('Invio automatico annullato. La data editoriale resta nel calendario.'); }
      if (action.type === 'published') { update(await api.editorial.markPublished(action.post.id)); toast.success('Pubblicazione manuale registrata'); }
      if (['resolvePublished','resolveMissing'].includes(action.type)) { await api.social.resolve(action.post.id, action.type === 'resolvePublished' ? 'published' : 'not_published'); await load(); toast.success('Esito registrato'); }
      setAction(null);
    } catch (e) { toast.error(e.message); await load(); }
    finally { setBusy(false); }
  };
  const copy = async p => {
    try { await copyText([p.caption,p.hashtags].filter(Boolean).join('\n\n')); toast.success('Testo copiato'); }
    catch { toast.error('Gli appunti non sono disponibili. Scarica il file ZIP con il testo.'); }
  };
  const card = (p, compact = false) => <EditorialPost key={p.id} post={p} compact={compact} onBrief={setDraft} onPlan={p => p.planning ? setDraft(p) : setPlan(p)} onSchedule={setSchedule} onAction={(type,post) => setAction({type,post})} onCopy={copy} />;
  const selectClass = 'min-h-11 min-w-0 w-full rounded-lg border border-input bg-background p-2.5 text-sm';
  const hasFilters = !!(search.trim() || platform || stage);
  const clearFilters = () => { setSearch(''); setPlatform(''); setStage(''); };
  const dayPosts = byDay.get(selected) || [];
  const visiblePosts = view === 'unscheduled' ? unscheduled : view === 'drafts' ? filtered.filter(p => p.planning && !p.image_url) : filtered;
  const planSaved = saved => { update(saved); setView(editorialDate(saved) ? window.matchMedia('(max-width: 767px)').matches ? 'agenda' : 'calendar' : 'unscheduled'); };
  const actionText = {
    delete: ['Eliminare questo post?', 'Il contenuto verrà rimosso definitivamente dalla Libreria e dal calendario.', 'Elimina post'],
    cancel: ['Annullare l’invio automatico?', 'Il post non verrà più inviato al social. La data resta come promemoria nel piano editoriale.', 'Annulla invio'],
    resolvePublished: ['Hai trovato il post sul social?', 'Confermi di aver verificato che il contenuto è stato pubblicato sull’account scelto. Non verrà inviato di nuovo.', 'Confermo: è pubblicato'],
    resolveMissing: ['Hai verificato che il post non è presente?', 'Controlla anche i contenuti in elaborazione sul social. Questa conferma sblocca il post per un eventuale nuovo invio, che dovrai richiedere tu.', 'Confermo: non è pubblicato'],
    published: ['Hai pubblicato questo contenuto?', 'Confermi una pubblicazione che hai già effettuato sui social. ClickSocial registra lo stato senza inviare il contenuto e il post diventa di sola lettura.', 'Conferma pubblicazione manuale'],
  }[action?.type];
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader subtitle="Libreria" />
    <main className="workspace-main space-y-5">
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4"><div className="min-w-0"><h1 className="workspace-title">Libreria e pianificazione</h1><p className="text-sm text-muted-foreground mt-2">Prepara le bozze, organizza gli shooting e genera i post.</p></div>
        <div className="flex flex-wrap gap-2 shrink-0"><Button data-tour="library-draft" variant="outline" onClick={() => setDraft({})} className="h-11">Nuova bozza</Button><Button data-tour="library-new" onClick={() => navigate('/studio?new=1')} className="h-11">Nuovo post</Button></div>
      </div>
      <div role="group" aria-label="Vista della libreria" data-tour="library-views">
        <label htmlFor="library-view" className="mb-2 block text-sm font-medium md:hidden">Visualizza</label>
        <select id="library-view" className={selectClass + ' md:hidden'} value={view} onChange={e => setView(e.target.value)}>
          <option value="agenda">Agenda</option><option value="calendar">Calendario</option><option value="list">Tutti i post</option><option value="drafts">Bozze editoriali</option><option value="unscheduled">Da pianificare</option>
        </select>
        <div className="section-tabs hidden md:flex md:flex-wrap">
        <button type="button" className="section-tab" aria-pressed={view === 'agenda'} onClick={() => setView('agenda')}>Agenda</button>
        <button type="button" className="section-tab" aria-pressed={view === 'calendar'} onClick={() => setView('calendar')}>Calendario</button>
        <button type="button" className="section-tab" aria-pressed={view === 'list'} onClick={() => setView('list')}>Tutti i post</button>
        <button type="button" className="section-tab" aria-pressed={view === 'drafts'} onClick={() => setView('drafts')}>Bozze editoriali</button>
        <button type="button" className="section-tab" data-tour="library-unscheduled" aria-pressed={view === 'unscheduled'} onClick={() => setView('unscheduled')}>Da pianificare</button>
        </div>
      </div>
      <div data-tour="library-filters" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="w-full sm:w-auto sm:flex-1"><label htmlFor="post-search" className="sr-only">Cerca nei post</label><Input id="post-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder="Cerca titolo, testo o note" className="h-11 rounded-lg" /></div>
          <Button variant="outline" className="h-11" aria-expanded={showFilters} aria-controls="library-filter-fields" onClick={() => setShowFilters(value => !value)}>{showFilters ? 'Chiudi filtri' : platform || stage ? 'Filtri attivi' : 'Filtri'}</Button>
          <Button variant="ghost" className="h-11" disabled={refreshing} onClick={load}>{refreshing ? 'Aggiornamento…' : 'Aggiorna'}</Button>
        </div>
        {showFilters && <div id="library-filter-fields" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <div><label htmlFor="platform-filter" className="block text-xs text-muted-foreground mb-1.5">Piattaforma</label><select id="platform-filter" className={selectClass} value={platform} onChange={e => setPlatform(e.target.value)}><option value="">Tutte le piattaforme</option>{Object.entries(PLATFORMS).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
          <div><label htmlFor="stage-filter" className="block text-xs text-muted-foreground mb-1.5">Stato</label><select id="stage-filter" className={selectClass} value={stage} onChange={e => setStage(e.target.value)}><option value="">Tutti gli stati</option>{Object.entries(STAGES).map(([key,label]) => <option key={key} value={key}>{label}</option>)}</select></div>
        </div>}
        {hasFilters && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><p className="text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? 'risultato' : 'risultati'}{platform ? ' · ' + PLATFORMS[platform] : ''}{stage ? ' · ' + STAGES[stage] : ''}</p><button type="button" className="min-h-11 text-purple underline underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={clearFilters}>Azzera filtri</button></div>}
      </div>
      {error && <div role="alert" className="border border-destructive rounded-xl p-4 text-sm"><p>Impossibile aggiornare la libreria: {error}</p><Button variant="outline" onClick={load} className="mt-3">Riprova</Button></div>}
      {posts === null && !error && <p role="status" className="text-sm">Caricamento dei contenuti…</p>}
      {posts?.length === 0 ? <section className="rounded-xl border border-dashed border-border px-5 py-12 text-center"><h2 className="font-heading text-xl">Prepara il prossimo contenuto</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">Puoi partire da una bozza, anche senza foto, oppure creare subito un post nello Studio.</p><Button className="mt-5" onClick={() => setDraft({})}>Crea una bozza editoriale</Button></section>
      : posts && !filtered.length ? <section className="rounded-xl border border-dashed border-border p-8 text-center"><h2 className="font-heading text-lg">Nessun post corrisponde alla ricerca</h2><p className="mt-2 text-sm text-muted-foreground">Prova un altro testo oppure azzera i filtri.</p></section>
      : posts && view === 'agenda' ? <section aria-label="Agenda delle pubblicazioni" className="space-y-6">{agenda.length ? agenda.map(([day, items]) => <section key={day} className="space-y-3"><h2 className="font-heading text-lg">{new Date(day + 'T12:00:00').toLocaleDateString('it-IT', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</h2><div className="grid auto-rows-fr sm:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(p => card(p))}</div></section>) : <p className="text-sm text-muted-foreground">Non ci sono ancora contenuti con una data prevista.</p>}{unscheduled.length > 0 && <Button variant="outline" onClick={() => setView('unscheduled')}>Apri i contenuti senza data</Button>}</section>
      : posts && view === 'calendar' ? <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <EditorialCalendar month={month} setMonth={setMonth} selected={selected} onSelect={setSelected} byDay={byDay} />
          <section data-tour="library-agenda" aria-labelledby="agenda-title" className="min-w-0 rounded-xl border border-border bg-card px-4">
            <div className="border-b border-border py-4"><h2 id="agenda-title" className="font-heading text-lg font-semibold">{new Date(selected + 'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'})}</h2><p className="text-xs text-muted-foreground mt-1">{dayPosts.length ? dayPosts.length + (dayPosts.length === 1 ? ' contenuto previsto' : ' contenuti previsti') : 'Nessun contenuto previsto'}</p><Button variant="outline" size="sm" className="mt-3 min-h-11" onClick={() => setDraft({ selectedDay: selected })}>Aggiungi bozza a questo giorno</Button></div>
            {dayPosts.length ? <div className="divide-y divide-border">{dayPosts.map(p => card(p, true))}</div> : <div className="py-5 space-y-3"><p className="text-sm text-muted-foreground">{hasFilters ? 'Per questo giorno non ci sono post con i filtri attuali.' : 'Scegli un contenuto da pianificare e assegnagli questa data.'}</p>{unscheduled.length > 0 && <Button variant="outline" onClick={() => setView('unscheduled')}>Scegli un post da pianificare</Button>}</div>}
          </section>
        </div> : posts && <section aria-label={view === 'unscheduled' ? 'Post da pianificare' : 'Tutti i post'}>
          <p className="text-sm text-muted-foreground mb-4" role="status">{view === 'unscheduled' ? visiblePosts.length ? visiblePosts.length + (visiblePosts.length === 1 ? ' contenuto senza data. Scegli Pianifica per inserirlo nel calendario.' : ' contenuti senza data. Scegli Pianifica per inserirli nel calendario.') : hasFilters ? 'Nessun contenuto senza data con i filtri attuali.' : 'Tutti i contenuti hanno una data.' : visiblePosts.length + (view === 'drafts' ? visiblePosts.length === 1 ? ' bozza in preparazione' : ' bozze in preparazione' : visiblePosts.length === 1 ? ' contenuto salvato' : ' contenuti salvati')}</p>
          {view === 'drafts' && !visiblePosts.length && <p className="text-sm text-muted-foreground mb-4">Nessuna bozza in preparazione con i filtri attuali.</p>}<div className="grid auto-rows-fr sm:grid-cols-2 xl:grid-cols-3 gap-4">{visiblePosts.map(p => card(p))}</div>
        </section>}
    </main>
    {plan && <PlanDialog key={plan.id} post={plan} selectedDay={selected} onClose={() => setPlan(null)} onSaved={planSaved} />}
    {draft && <PlanningDraftDialog key={draft.id || 'new'} post={draft} selectedDay={draft.selectedDay || ''} onClose={() => setDraft(null)} onSaved={planSaved} />}
    {schedule && <ScheduleDialog post={schedule} open onOpenChange={value => { if (!value) setSchedule(null); }} onScheduled={load} />}
    <ConfirmAction open={!!action} onOpenChange={value => { if (!value) setAction(null); }} title={actionText?.[0]} description={actionText?.[1]} confirmLabel={actionText?.[2]} onConfirm={confirm} busy={busy} destructive={action?.type === 'delete'} />
  </div>;
}

