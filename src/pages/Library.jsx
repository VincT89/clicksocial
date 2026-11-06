import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI, languageLocale } from '@/lib/i18n';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/api/client';
import { copyText } from '@/lib/mobile';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import ScheduleDialog from '@/components/library/ScheduleDialog';
import PlanDialog from '@/components/library/PlanDialog';
import PlanningDraftDialog from '@/components/library/PlanningDraftDialog';
import EditorialCalendar from '@/components/library/EditorialCalendar';
import EditorialPost from '@/components/library/EditorialPost';
import '@/components/library/Library.css';
import ConfirmAction from '@/components/ConfirmAction';
import { toast } from 'sonner';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { dayKey, moveMonth, editorialDate, editorialStage, scheduledTime, STAGES, PLATFORMS } from '@/lib/editorialDates.mjs';

const stageFilters = { programmato:'Programmato', ...STAGES };

export default function Library({ calendar = false }) {
  useI18n();
  const navigate = useNavigate();
  const [posts, setPosts] = useState(null);
  const [error, setError] = useState('');
  const [month, setMonth] = useState(() => moveMonth(new Date(),0));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [search, setSearch] = useState('');
  const [platform, setPlatform] = useState('');
  const [params, setParams] = useSearchParams();
  const requestedStage = params.get('stage') || '';
  const stage = Object.hasOwn(stageFilters, requestedStage) ? requestedStage : '';
  const setStage = value => setParams(current => {
    const next = new URLSearchParams(current);
    if (value) next.set('stage', value);
    else next.delete('stage');
    return next;
  }, { replace: true });
  const view = ['list', 'drafts', 'published', 'calendar', 'agenda', 'unscheduled'].includes(params.get('view')) ? params.get('view') : calendar ? 'calendar' : 'list';
  const setView = value => setParams(stage && stage !== 'programmato' ? { view: value, stage } : { view: value }, { replace: true });
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
  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('it-IT');
    const result = (posts || []).filter(post => {
      if (platform && post.platform !== platform) return false;
      const matchesStage = stage === 'programmato' ? Number.isFinite(scheduledTime(post)) : editorialStage(post) === stage;
      if (stage && !matchesStage) return false;
      const fields = [post.title, post.headline, post.caption, post.hashtags, post.editorial_notes, post.planning?.topic,
        post.planning?.objective, post.planning?.shots, post.planning?.notes, post.planning?.provisional_copy];
      return !term || fields.some(value => String(value || '').toLocaleLowerCase('it-IT').includes(term));
    });
    return stage === 'programmato' ? result.sort((a, b) => scheduledTime(a) - scheduledTime(b)) : result;
  }, [posts, platform, stage, search]);
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
      if (action.type === 'delete') { await api.entities.Post.delete(action.post.id); setPosts(current => current.filter(p => p.id !== action.post.id)); toast.success(translateUI("Post eliminato")); }
      if (action.type === 'cancel') { update(await api.editorial.cancelSchedule(action.post.id)); toast.success(translateUI("Invio automatico annullato. La data editoriale resta nel calendario.")); }
      if (action.type === 'published') { update(await api.editorial.markPublished(action.post.id)); toast.success(translateUI("Pubblicazione manuale registrata")); }
      if (['resolvePublished','resolveMissing'].includes(action.type)) { await api.social.resolve(action.post.id, action.type === 'resolvePublished' ? 'published' : 'not_published'); await load(); toast.success(translateUI("Esito registrato")); }
      setAction(null);
    } catch (e) { toast.error(translateUI(e.message)); await load(); }
    finally { setBusy(false); }
  };
  const copy = async p => {
    try { await copyText([p.caption,p.hashtags].filter(Boolean).join('\n\n')); toast.success(translateUI("Testo copiato")); }
    catch { toast.error(translateUI("Gli appunti non sono disponibili. Scarica il file ZIP con il testo.")); }
  };
  const card = (p, compact = false) => <EditorialPost key={p.id} post={p} compact={compact} onBrief={setDraft} onPlan={p => p.planning ? setDraft(p) : setPlan(p)} onSchedule={setSchedule} onAction={(type,post) => setAction({type,post})} onCopy={copy} />;
  const selectClass = 'min-h-11 min-w-0 w-full rounded-lg border border-input bg-background p-2.5 text-sm';
  const hasFilters = !!(search.trim() || platform || stage);
  const clearFilters = () => { setSearch(''); setPlatform(''); setStage(''); };
  const dayPosts = byDay.get(selected) || [];
  let visiblePosts = filtered;
  if (view === 'drafts') {
    visiblePosts = filtered.filter(post => ['bozza', 'pronto', 'fallito'].includes(post.status));
    visiblePosts.sort((a, b) => String(b.updated_date || b.created_date || '').localeCompare(String(a.updated_date || a.created_date || '')));
  } else if (view === 'published') {
    visiblePosts = filtered.filter(post => post.status === 'pubblicato');
  } else if (view === 'unscheduled') {
    visiblePosts = unscheduled;
  }
  const planSaved = saved => { update(saved); setView(editorialDate(saved) ? 'calendar' : 'drafts'); };
  const actionText = {
    delete: ['Eliminare questo post?', 'Il contenuto verrà rimosso definitivamente dalla Libreria e dal calendario.', 'Elimina post'],
    cancel: ['Annullare l’invio automatico?', 'Il post non verrà più inviato al social. La data resta come promemoria nel piano editoriale.', 'Annulla invio'],
    resolvePublished: ['Hai trovato il post sul social?', 'Confermi di aver verificato che il contenuto è stato pubblicato sull’account scelto. Non verrà inviato di nuovo.', 'Confermo: è pubblicato'],
    resolveMissing: ['Hai verificato che il post non è presente?', 'Controlla anche i contenuti in elaborazione sul social. Questa conferma sblocca il post per un eventuale nuovo invio, che dovrai richiedere tu.', 'Confermo: non è pubblicato'],
    published: ['Hai pubblicato questo contenuto?', 'Confermi una pubblicazione che hai già effettuato sui social. ClickSocial registra lo stato senza inviare il contenuto e il post diventa di sola lettura.', 'Conferma pubblicazione manuale'],
  }[action?.type];
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader subtitle={calendar ? translateUI("Calendario") : translateUI("Post salvati")} />
    <main className="workspace-main space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="workspace-title min-w-0 break-words">{calendar ? translateUI("Calendario editoriale") : translateUI("Post salvati")}</h1>
        <div className="flex flex-wrap items-center gap-2">
        {!calendar && <Button asChild variant="outline"><Link to="/media">{translateUI("Libreria media")}</Link></Button>}
        <Button data-tour="library-new" onClick={() => navigate('/studio?new=1')} className="h-11 shrink-0">{translateUI("Nuovo post")}</Button>
        </div>
      </div>
      {!calendar && <div role="group" aria-label={translateUI("Vista della libreria")} data-tour="library-views">
        <div className="section-tabs library-views">
        <button type="button" className="section-tab" aria-pressed={view === 'list'} onClick={() => setView('list')}>{translateUI("Tutti")}</button>
        <button type="button" className="section-tab" aria-pressed={view === 'drafts'} onClick={() => setView('drafts')}>{translateUI("Bozze")}</button>
        <button type="button" className="section-tab" aria-pressed={view === 'published'} onClick={() => setView('published')}>{translateUI("Pubblicati")}</button>
        <button type="button" className="section-tab" aria-pressed={['calendar', 'agenda', 'unscheduled'].includes(view)} onClick={() => setView('calendar')}>{translateUI("Calendario")}</button>
        </div>
      </div>
      }
      {['calendar', 'agenda', 'unscheduled'].includes(view) && <div className="flex flex-wrap gap-3 items-end"><div><label htmlFor="planning-view" className="block text-sm mb-1">{translateUI("Organizza per")}</label><AppSelect id="planning-view" className={selectClass} value={view} onChange={event => setView(event.target.value)}><option value="calendar">{translateUI("Calendario")}</option><option value="agenda">{translateUI("Agenda")}</option><option value="unscheduled">{translateUI("Senza data")}</option></AppSelect></div><Button data-tour="library-draft" variant="outline" onClick={() => setDraft({})} className="h-11">{translateUI("Annota un’idea")}</Button></div>}
      <div data-tour="library-filters" className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="min-w-0 flex-1"><label htmlFor="post-search" className="sr-only">{translateUI("Cerca nei post")}</label><Input id="post-search" type="search" value={search} onChange={e => setSearch(e.target.value)} placeholder={translateUI("Cerca un post")} className="h-11 rounded-lg" /></div>
          <Button variant="outline" className="h-11" aria-expanded={showFilters} aria-controls="library-filter-fields" onClick={() => setShowFilters(value => !value)}>{showFilters ? translateUI("Chiudi filtri") : platform || stage ? translateUI("Filtri attivi") : translateUI("Filtri")}</Button>
          <Button variant="ghost" className="h-11" disabled={refreshing} onClick={load}>{refreshing ? translateUI("Aggiornamento…") : translateUI("Aggiorna")}</Button>
        </div>
        {showFilters && <div id="library-filter-fields" className="grid gap-3 rounded-xl border border-border bg-card p-4 sm:grid-cols-2">
          <div><label htmlFor="platform-filter" className="block text-xs text-muted-foreground mb-1.5">{translateUI("Piattaforma")}</label><AppSelect id="platform-filter" className={selectClass} value={platform} onChange={e => setPlatform(e.target.value)}><option value="">{translateUI("Tutte le piattaforme")}</option>{Object.entries(PLATFORMS).map(([key,label]) => <option key={key} value={key}>{translateUI(label)}</option>)}</AppSelect></div>
          <div><label htmlFor="stage-filter" className="block text-xs text-muted-foreground mb-1.5">{translateUI("Stato")}</label><AppSelect id="stage-filter" className={selectClass} value={stage} onChange={e => setStage(e.target.value)}><option value="">{translateUI("Tutti gli stati")}</option>{Object.entries(stageFilters).map(([key,label]) => <option key={key} value={key}>{translateUI(label)}</option>)}</AppSelect></div>
        </div>}
        {hasFilters && <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"><p className="text-muted-foreground" role="status">{filtered.length} {filtered.length === 1 ? translateUI("risultato") : translateUI("risultati")}{platform ? ' · ' + PLATFORMS[platform] : ''}{stage ? ' · ' + translateUI(stageFilters[stage]) : ''}</p><button type="button" className="min-h-11 text-purple underline underline-offset-4 focus-visible:outline-none focus-visible:ring-ring" onClick={clearFilters}>{translateUI("Azzera filtri")}</button></div>}
      </div>
      {error && <div role="alert" className="border border-destructive rounded-xl p-4 text-sm"><p>{translateUI("Impossibile aggiornare la libreria:")} {error}</p><Button variant="outline" onClick={load} className="mt-3">{translateUI("Riprova")}</Button></div>}
      {posts === null && !error && <p role="status" className="text-sm">{translateUI("Caricamento dei contenuti…")}</p>}
      {posts?.length === 0 && view !== 'calendar' ? <section className="rounded-xl border border-dashed border-border px-5 py-12 text-center"><h2 className="font-heading text-xl">{translateUI("Il primo post parte da una foto")}</h2><p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{translateUI("Caricala o scattala nello Studio, poi premi Genera. Qui ritroverai le bozze e i post pubblicati.")}</p><Button className="mt-5" onClick={() => navigate('/studio?new=1')}>{translateUI("Crea un post")}</Button></section>
      : posts && !filtered.length && view !== 'calendar' ? <section className="rounded-xl border border-dashed border-border p-8 text-center"><h2 className="font-heading text-lg">{translateUI("Nessun post corrisponde alla ricerca")}</h2><p className="mt-2 text-sm text-muted-foreground">{translateUI("Prova un altro testo oppure azzera i filtri.")}</p></section>
      : posts && view === 'agenda' ? <section aria-label={translateUI("Agenda delle pubblicazioni")} className="space-y-6">{agenda.length ? agenda.map(([day, items]) => <section key={day} className="space-y-3"><h2 className="font-heading text-lg">{new Date(day + 'T12:00:00').toLocaleDateString(languageLocale(), { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</h2><div className="grid auto-rows-fr sm:grid-cols-2 xl:grid-cols-3 gap-4">{items.map(p => card(p))}</div></section>) : <p className="text-sm text-muted-foreground">{translateUI("Non ci sono ancora contenuti con una data prevista.")}</p>}{unscheduled.length > 0 && <Button variant="outline" className="min-h-11 h-auto max-w-full whitespace-normal" onClick={() => setView('unscheduled')}>{translateUI("Apri i contenuti senza data")}</Button>}</section>
      : posts && view === 'calendar' ? <div className="grid lg:grid-cols-[minmax(0,1fr)_320px] gap-5 items-start">
          <EditorialCalendar month={month} setMonth={setMonth} selected={selected} onSelect={setSelected} byDay={byDay} />
          <section data-tour="library-agenda" aria-labelledby="agenda-title" className="min-w-0 rounded-xl border border-border bg-card px-4">
            <div className="border-b border-border py-4"><h2 id="agenda-title" className="font-heading text-lg font-semibold">{new Date(selected + 'T12:00:00').toLocaleDateString(languageLocale(),{weekday:'long',day:'numeric',month:'long'})}</h2><p className="text-xs text-muted-foreground mt-1">{dayPosts.length ? dayPosts.length + (dayPosts.length === 1 ? translateUI(" contenuto previsto") : translateUI(" contenuti previsti")) : translateUI("Nessun contenuto previsto")}</p><Button variant="outline" size="sm" className="mt-3 min-h-11 h-auto max-w-full whitespace-normal" onClick={() => setDraft({ selectedDay: selected })}>{translateUI("Aggiungi bozza a questo giorno")}</Button></div>
            {dayPosts.length ? <div className="divide-y divide-border">{dayPosts.map(p => card(p, true))}</div> : <div className="py-5 space-y-3"><p className="text-sm text-muted-foreground">{hasFilters ? translateUI("Per questo giorno non ci sono post con i filtri attuali.") : translateUI("Scegli un contenuto da pianificare e assegnagli questa data.")}</p>{unscheduled.length > 0 && <Button variant="outline" onClick={() => setView('unscheduled')}>{translateUI("Scegli un post da pianificare")}</Button>}</div>}
          </section>
        </div> : posts && <section aria-label={view === 'unscheduled' ? translateUI("Post da pianificare") : view === 'drafts' ? translateUI("Bozze") : view === 'published' ? translateUI("Post pubblicati") : translateUI("Tutti i post")}>
          {view === 'unscheduled' && visiblePosts.length > 0 && <p className="text-sm text-muted-foreground mb-4">{translateUI("Scegli Pianifica nelle azioni del post per dargli una data.")}</p>}
          {!visiblePosts.length && <p className="text-sm text-muted-foreground mb-4" role="status">
            {view === 'drafts' ? translateUI("Nessuna bozza in questa vista.") : view === 'published' ? translateUI("Nessun post pubblicato in questa vista.") : translateUI("Nessun post in questa vista.")}
          </p>}
          <div className="library-gallery">{visiblePosts.map(p => card(p))}</div>
        </section>}
    </main>
    {plan && <PlanDialog key={plan.id} post={plan} selectedDay={selected} onClose={() => setPlan(null)} onSaved={planSaved} />}
    {draft && <PlanningDraftDialog key={draft.id || 'new'} post={draft} selectedDay={draft.selectedDay || ''} onClose={() => setDraft(null)} onSaved={planSaved} />}
    {schedule && <ScheduleDialog post={schedule} open onOpenChange={value => { if (!value) setSchedule(null); }} onScheduled={load} />}
    <ConfirmAction open={!!action} onOpenChange={value => { if (!value) setAction(null); }} title={actionText?.[0]} description={actionText?.[1]} confirmLabel={actionText?.[2]} onConfirm={confirm} busy={busy} destructive={action?.type === 'delete'} />
  </div>;
}

