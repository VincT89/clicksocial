import { useRef, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';
import AvatarChoice from '@/components/OptionAvatar';
import { copyText } from '@/lib/mobile';

const modes = [
  { value: 'original', label: 'Original', hint: 'Titolo sulla tua foto' },
  { value: 'enhance', label: 'Enhance', hint: 'Ritocco della foto con AI' },
  { value: 'creative', label: 'Creative', hint: 'Grafica editoriale con AI' },
];
const tones = [
  { value: 'amichevole', label: 'Amichevole' }, { value: 'professionale', label: 'Professionale' },
  { value: 'divertente', label: 'Divertente' }, { value: 'elegante', label: 'Elegante' },
];
export default function CopyPanel({ platform, setPlatform, tone, setTone, mode, setMode, context, setContext, onGenerate, generating, copy, setCopy, aiAvailable, canGenerate = true, templateMode = false, fromPlanning = false }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const copyAll = async () => {
    try {
      await copyText([copy?.caption, copy?.hashtags].filter(Boolean).join('\n\n'));
      setCopied(true); clearTimeout(timer.current); timer.current = setTimeout(() => setCopied(false), 1800);
    } catch { toast.error('Gli appunti non sono disponibili. Seleziona e copia il testo dai campi.'); }
  };
  return <div className="space-y-5">
    <fieldset data-tour="studio-mode" disabled={generating}>
      <legend className="text-sm font-medium mb-2">Modalità</legend>
      <div className="grid grid-cols-3 gap-2">{modes.map(m => <button key={m.value} type="button" aria-pressed={mode === m.value} onClick={() => setMode(m.value)}
        className={['min-w-0 rounded-xl border px-2 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50', mode === m.value ? 'border-purple bg-accent' : 'border-border hover:bg-secondary'].join(' ')}>
        <span className="block text-sm font-medium">{m.label}</span>
        <span className="block mt-1 text-xs leading-snug text-muted-foreground">{templateMode && m.value === 'creative' ? 'Nuova ambientazione con AI' : templateMode && m.value === 'original' ? 'Template sulla tua foto' : m.hint}</span>
      </button>)}</div>
    </fieldset>
    <fieldset data-tour="studio-platform" disabled={generating}>
      <legend className="text-sm font-medium mb-2">Piattaforma</legend>
      <div className="grid grid-cols-3 gap-2">{['Instagram','Facebook','TikTok'].map(p => <button key={p} type="button" aria-pressed={String(platform).toLowerCase() === p.toLowerCase()} onClick={() => setPlatform(p)}
        className={['rounded-xl border py-3 text-xs font-medium', String(platform).toLowerCase() === p.toLowerCase() ? 'border-purple bg-accent text-foreground' : 'border-border hover:bg-secondary'].join(' ')}>{p}</button>)}</div>
    </fieldset>
    <fieldset data-tour="studio-tone" disabled={generating}>
      <legend className="text-sm font-medium mb-2">Tono di voce</legend>
      <div className="grid grid-cols-2 min-[360px]:grid-cols-4 gap-1">{tones.map((t, index) => <AvatarChoice compact key={t.value} index={index + 3} label={t.label} selected={tone === t.value} onClick={() => setTone(t.value)} />)}</div>
    </fieldset>
    <div data-tour="studio-context">
      <label htmlFor="post-context" className="text-sm font-medium block mb-2">Cosa vuoi comunicare?</label>
      <Textarea id="post-context" value={context} onChange={e => setContext(e.target.value)} maxLength={2000} disabled={generating} rows={3} placeholder="Descrivi il contenuto, i dettagli reali da includere e il messaggio da trasmettere." className="rounded-xl" />
      <p className="text-xs text-muted-foreground mt-2">Descrizione facoltativa per guidare la generazione AI.</p>
    </div>
    <Button data-tour="studio-generate" onClick={onGenerate} disabled={generating || !aiAvailable || !canGenerate} className="w-full">
      {generating && <Loader2 size={16} className="mr-2 animate-spin" />}{generating ? 'Generazione in corso…' : fromPlanning ? 'Genera post dalla bozza' : 'Genera post con AI'}
    </Button>
    {!aiAvailable && <p className="text-xs text-muted-foreground">L’AI per questa modalità è da configurare. Puoi scrivere il testo e salvare il post.</p>}
    <div data-tour="studio-copy-result" className="space-y-3 pt-4 border-t border-border">
      <div><label htmlFor="copy-headline" className="text-sm font-medium">Titolo grafica</label>
        <Input id="copy-headline" value={copy?.headline || ''} maxLength={200} disabled={generating} onChange={e => setCopy({ ...copy, headline: e.target.value })} className="mt-1 rounded-xl" />
        {templateMode ? <p className="text-xs text-muted-foreground mt-2">Il titolo si aggiorna direttamente nel template, senza rigenerare l’immagine.</p> : copy?.graphic_url && mode !== 'original' && <p className="text-xs text-muted-foreground mt-2">Il testo già disegnato nell’immagine AI non cambia modificando questo campo. Per aggiornare la grafica, indica la modifica nella descrizione e generala di nuovo.</p>}
      </div>
      {templateMode && <div><label htmlFor="copy-subtitle" className="text-sm font-medium">Testo di supporto nella grafica (facoltativo)</label><Textarea id="copy-subtitle" value={copy?.graphic_subtitle || ''} rows={2} maxLength={200} disabled={generating} onChange={e => setCopy({ ...copy, graphic_subtitle: e.target.value })} className="mt-1 rounded-xl" /></div>}
      <div className="flex items-center justify-between">
        <label htmlFor="copy-caption" className="text-sm font-medium">Caption</label>
        <Button variant="ghost" size="sm" onClick={copyAll} disabled={!copy?.caption && !copy?.hashtags}><Copy size={14} className="mr-2" />{copied ? 'Copiato' : 'Copia tutto'}</Button>
      </div>
      <Textarea id="copy-caption" rows={4} maxLength={10000} disabled={generating} value={copy?.caption || ''} onChange={e => setCopy({ ...copy, caption: e.target.value })} className="rounded-xl" />
      <div><label htmlFor="copy-hashtags" className="text-sm font-medium">Hashtag</label>
        <Textarea id="copy-hashtags" rows={2} maxLength={2000} disabled={generating} value={copy?.hashtags || ''} onChange={e => setCopy({ ...copy, hashtags: e.target.value })} className="mt-1 rounded-xl" />
      </div>
    </div>
  </div>;
}

