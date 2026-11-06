import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useState } from 'react';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { localDateTime, toInstant } from '@/lib/editorialDates.mjs';
import { toast } from 'sonner';

export default function PlanDialog({ post, selectedDay, onClose, onSaved }) {
  useI18n();
  const [when, setWhen] = useState(post.editorial_at ? localDateTime(post.editorial_at) : selectedDay + 'T09:00');
  const [notes, setNotes] = useState(post.editorial_notes || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const save = async (remove = false) => {
    const date = remove ? null : toInstant(when);
    if (!remove && !date) { setError('Scegli una data e un’ora valide. L’orario potrebbe non esistere nel cambio dell’ora legale.'); return; }
    setBusy(true); setError('');
    try {
      const saved = await api.editorial.plan(post.id, { editorial_at:date, editorial_notes:notes });
      onSaved(saved); toast.success(remove ? translateUI("Data rimossa dal calendario") : translateUI("Post inserito nel piano editoriale")); onClose();
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  return <Dialog open onOpenChange={value => { if (!value && !busy) onClose(); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>{translateUI("Pianifica il contenuto")}</DialogTitle><DialogDescription>{translateUI("Assegna una data a «")}{post.title || translateUI("Senza titolo")}{translateUI("». Questo promemoria nel calendario non pubblica il post sui social.")}</DialogDescription></DialogHeader>
      <div className="space-y-2"><Label htmlFor="editorial-when">{translateUI("Data e ora prevista")}</Label><Input id="editorial-when" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={busy} /><p className="text-xs text-muted-foreground">{translateUI("Ora locale:")} {Intl.DateTimeFormat().resolvedOptions().timeZone}</p></div>
      <div className="space-y-2"><Label htmlFor="editorial-notes">{translateUI("Note editoriali")}</Label><Textarea id="editorial-notes" value={notes} onChange={e => setNotes(e.target.value)} maxLength={5000} rows={4} disabled={busy} placeholder={translateUI("Obiettivo del contenuto, materiali da preparare, revisioni da fare…")} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <DialogFooter className="gap-2">{post.editorial_at && <Button variant="outline" disabled={busy} onClick={() => save(true)}>{translateUI("Rimuovi data")}</Button>}<Button onClick={() => save()} disabled={busy}>{busy ? translateUI("Salvataggio…") : translateUI("Salva nel calendario")}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

