import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localDateTime, toInstant } from '@/lib/editorialDates.mjs';
import { toast } from 'sonner';

export default function ScheduleDialog({ post, open, onOpenChange, onScheduled }) {
  const [state, setState] = useState(null);
  const [pageId, setPageId] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!open) return;
    let active = true;
    setState(null); setPageId(''); setError('');
    setWhen(localDateTime(post.scheduled_at || (post.editorial_at && new Date(post.editorial_at).getTime() > Date.now() ? post.editorial_at : new Date(Date.now() + 3600000))));
    Promise.all([api.auth.me(), api.functions.invoke('socialStatus')]).then(([me, result]) => {
      if (!active) return;
      setState({ pro:me.plan === 'pro', ...result.data.facebook });
      setPageId(result.data.facebook.pages?.find(p => p.id === post.social_page_id)?.id || result.data.facebook.pages?.[0]?.id || '');
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [open, post]);
  const confirm = async () => {
    const date = toInstant(when);
    if (!date || new Date(date).getTime() <= Date.now()) { setError('Scegli una data e un’ora future valide.'); return; }
    setSaving(true); setError('');
    try {
      await api.functions.invoke('schedulePost', { post_id:post.id, page_id:pageId, scheduled_at:date });
      toast.success('Invio automatico programmato'); await onScheduled(); onOpenChange(false);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const ready = state?.pro && state?.connected && state?.pages?.length > 0;
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Invio automatico a Facebook</DialogTitle><DialogDescription>Il server controlla i post ogni cinque minuti. Deve rimanere acceso e connesso; l’invio può avvenire dopo l’orario scelto.</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!state && !error && <p role="status" className="text-sm">Caricamento delle Pagine…</p>}
      {state && !state.pro && <p className="text-sm">L’invio automatico richiede il <Link className="text-purple underline" to="/profilo">piano Pro</Link>. Il calendario editoriale è disponibile anche con il piano gratuito.</p>}
      {state?.pro && !state.connected && <p className="text-sm">Collega una Pagina Facebook dal <Link className="text-purple underline" to="/profilo">Profilo</Link>.</p>}
      {state?.pro && state.connected && !state.pages.length && <p className="text-sm">Nessuna Pagina disponibile per l’account Facebook collegato.</p>}
      {ready && <>
        <div className="space-y-2"><Label htmlFor="schedule-page">Pagina Facebook</Label><select id="schedule-page" className="w-full border border-input rounded-md p-3 text-sm bg-background" value={pageId} onChange={e => setPageId(e.target.value)} disabled={saving}>{state.pages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="schedule-when">Data e ora dell’invio</Label><Input id="schedule-when" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={saving} /><p className="text-xs text-muted-foreground">Ora locale: {Intl.DateTimeFormat().resolvedOptions().timeZone}. Anche la data nel piano editoriale verrà aggiornata.</p></div>
        <DialogFooter><Button onClick={confirm} disabled={saving || !pageId || !when}>{saving ? 'Programmazione…' : 'Conferma invio automatico'}</Button></DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}

