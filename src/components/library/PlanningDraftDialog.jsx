import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { newPostDesign } from '../../../shared/templates.mjs';
import { DEFAULT_MODE, defaultTone } from '../../../shared/postDefaults.mjs';
import { PLATFORMS, localDateTime, toInstant } from '@/lib/editorialDates.mjs';
import TemplateSelector from '@/components/studio/TemplateSelector';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PlanningDraftDialog({ post, selectedDay = '', onClose, onSaved }) {
  useI18n();
  const { user } = useAuth();
  const [planning, setPlanning] = useState({ topic: '', objective: '', shots: '', notes: '', provisional_copy: '', stage: 'da_preparare', ...post?.planning });
  const [when, setWhen] = useState(post?.editorial_at ? localDateTime(post.editorial_at) : !post?.id && selectedDay ? selectedDay + 'T09:00' : '');
  const [shooting, setShooting] = useState(post?.planning?.shooting_at ? localDateTime(post.planning.shooting_at) : '');
  const [platform, setPlatform] = useState(post?.platform || 'instagram');
  const [design, setDesign] = useState(() => post?.design || newPostDesign(user));
  const [busy, setBusy] = useState(false), [loading, setLoading] = useState(!post?.id), [error, setError] = useState('');
  const lock = useRef(false);
  useEffect(() => {
    if (post?.id) return;
    let active = true;
    api.auth.me().then(me => { if (active) setDesign(newPostDesign(me)); }).catch(e => { if (active) setError(e.message); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [post?.id]);
  const field = (key, value) => setPlanning(p => ({ ...p, [key]: value }));
  const save = async event => {
    event.preventDefault(); if (lock.current || loading) return;
    if (!planning.topic.trim()) { setError('Scrivi l’argomento della bozza.'); return; }
    const editorialAt = when ? toInstant(when) : null, shootingAt = shooting ? toInstant(shooting) : null;
    if ((when && !editorialAt) || (shooting && !shootingAt)) { setError('Controlla data e ora di pubblicazione e shooting.'); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const payload = { planning: { ...planning, shooting_at: shootingAt }, editorial_at: editorialAt,
        ...(!post?.image_url ? { title: planning.topic.trim(), platform, design, mode: post?.mode || DEFAULT_MODE, tone: post?.tone || defaultTone(user), status: 'bozza' } : {}) };
      const saved = post?.id ? await api.entities.Post.update(post.id, payload) : await api.entities.Post.create(payload);
      onSaved(saved); onClose(); toast.success(translateUI("Bozza editoriale salvata"));
    } catch (e) { setError(e.message); }
    finally { lock.current = false; setBusy(false); }
  };
  const control = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
  return <Dialog open onOpenChange={open => { if (!open && !busy) onClose(); }}>
    <DialogContent className="flex w-[calc(100%-2rem)] max-w-2xl max-h-[calc(100dvh-2rem-var(--app-safe-top,env(safe-area-inset-top))-var(--app-safe-bottom,env(safe-area-inset-bottom)))] flex-col gap-0 overflow-hidden p-0 [&>button]:bg-background [&>button]:z-10">
      <DialogHeader className="shrink-0 border-b border-border px-5 py-5 pr-14 text-left"><DialogTitle>{post?.id ? translateUI("La tua idea") : translateUI("Annota un’idea")}</DialogTitle><DialogDescription>{translateUI("Basta un argomento. Potrai aggiungere la foto e generare il post in seguito.")}</DialogDescription></DialogHeader>
      <form onSubmit={save} className="flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5" data-planning-scroll>
        <fieldset disabled={busy || loading} className="min-w-0 space-y-5">
          {loading && <p role="status">{translateUI("Caricamento delle impostazioni aziendali…")}</p>}
          <div className="space-y-2"><label htmlFor="draft-topic" className="text-sm font-medium">{translateUI("Argomento *")}</label><Input id="draft-topic" value={planning.topic} required maxLength={200} onChange={e => field('topic', e.target.value)} /></div>
          <details><summary className="min-h-11 py-3 cursor-pointer text-sm font-medium">{translateUI("Aggiungi dettagli e date (facoltativo)")}</summary><div className="space-y-5 pt-3">
          <div className="space-y-2"><label htmlFor="draft-objective" className="text-sm font-medium">{translateUI("Obiettivo e messaggio")}</label><Textarea id="draft-objective" value={planning.objective} maxLength={2000} rows={3} onChange={e => field('objective', e.target.value)} placeholder={translateUI("Cosa deve comunicare questo contenuto?")} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="draft-date" className="text-sm font-medium">{translateUI("Pubblicazione prevista (facoltativa)")}</label><Input id="draft-date" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} /><button type="button" className="min-h-11 text-sm text-purple underline" onClick={() => setWhen('')}>{translateUI("Lascia senza data")}</button></div>
            <div className="space-y-2"><label htmlFor="draft-platform" className="text-sm font-medium">{translateUI("Social")}</label><AppSelect id="draft-platform" value={platform} disabled={!!post?.image_url} className={control} onChange={e => setPlatform(e.target.value)}>{Object.entries(PLATFORMS).map(([key, label]) => <option key={key} value={key}>{translateUI(label)}</option>)}</AppSelect></div></div>
          <div className="space-y-2"><label htmlFor="draft-shots" className="text-sm font-medium">{translateUI("Scatti da preparare")}</label><Textarea id="draft-shots" value={planning.shots} maxLength={5000} rows={3} onChange={e => field('shots', e.target.value)} placeholder={translateUI("Soggetti, prodotti, ambientazione, dettagli e inquadrature necessari.")} /></div>
          <div className="grid gap-4 sm:grid-cols-2"><div className="space-y-2"><label htmlFor="draft-shooting" className="text-sm font-medium">{translateUI("Data shooting (facoltativa)")}</label><Input id="draft-shooting" type="datetime-local" value={shooting} onChange={e => setShooting(e.target.value)} /></div>
            <div className="space-y-2"><label htmlFor="draft-stage" className="text-sm font-medium">{translateUI("Preparazione")}</label><AppSelect id="draft-stage" value={planning.stage} className={control} onChange={e => field('stage', e.target.value)}><option value="da_preparare">{translateUI("Da preparare")}</option><option value="da_fotografare">{translateUI("Da fotografare")}</option><option value="materiale_disponibile">{translateUI("Materiale disponibile")}</option></AppSelect></div></div>
          <div className="space-y-2"><label htmlFor="draft-copy" className="text-sm font-medium">{translateUI("Testo provvisorio")}</label><Textarea id="draft-copy" value={planning.provisional_copy} maxLength={5000} rows={3} onChange={e => field('provisional_copy', e.target.value)} /></div>
          <div className="space-y-2"><label htmlFor="draft-notes" className="text-sm font-medium">{translateUI("Note")}</label><Textarea id="draft-notes" value={planning.notes} maxLength={5000} rows={3} onChange={e => field('notes', e.target.value)} /></div>
          {!post?.image_url && <TemplateSelector value={design} onChange={setDesign} disabled={busy || loading} />}
          <p className="text-xs text-muted-foreground">{translateUI("Le date usano il fuso")} {Intl.DateTimeFormat().resolvedOptions().timeZone}{translateUI(". Salvare l’idea non consuma generazioni AI e non programma invii ai social.")}</p>
          </div></details>
        </fieldset>
        </div>
        <div className="shrink-0 border-t border-border bg-background p-4 space-y-3">{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{translateUI("Annulla")}</Button><Button type="submit" disabled={busy || loading}>{busy ? translateUI("Salvataggio…") : translateUI("Salva bozza")}</Button></div></div>
      </form>
    </DialogContent>
  </Dialog>;
}
