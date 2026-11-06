import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI } from '@/lib/i18n';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { POST_TONES } from '../../../shared/postDefaults.mjs';

const modes = [
  { value: 'graphic', label: 'Grafica AI', hint: 'Foto e scritte create insieme' },
  { value: 'creative', label: 'Foto creativa', hint: 'Rielabora la foto, scritte modificabili' },
  { value: 'enhance', label: 'Ritocco', hint: 'Migliora la foto senza trasformarla' },
  { value: 'original', label: 'Originale', hint: 'Mantiene la foto che hai caricato' },
];
export default function CopyPanel({ platform, setPlatform, tone, setTone, mode, setMode, generating, copy, setCopy, templateMode = false, autoTextStyle = true, onAutoTextStyleChange, imageText = false }) {
  useI18n();
  return <div className="space-y-5">
    <fieldset data-tour="studio-mode" disabled={generating}>
      <legend className="text-sm font-medium mb-2">{translateUI("Come creare il post")}</legend>
      <div className="grid grid-cols-2 gap-2">{modes.map(m => <button key={m.value} type="button" aria-pressed={mode === m.value} onClick={() => setMode(m.value)}
        className={['min-w-0 rounded-xl border px-2 py-3 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50', mode === m.value ? 'border-purple bg-accent' : 'border-border hover:bg-secondary'].join(' ')}>
        <span className="block text-sm font-medium">{translateUI(m.label)}</span><span className="block mt-1 text-xs leading-snug text-muted-foreground">{translateUI(m.hint)}</span>
      </button>)}</div>
    </fieldset>
    {mode === 'graphic' ? <p className="text-sm text-muted-foreground">{translateUI("L’AI compone foto, scritte e stile insieme, senza fondini aggiunti. Per cambiare le scritte serve rigenerare. Logo e descrizione restano modificabili.")}</p> : templateMode && <div className="space-y-1"><div className="setting-switch"><label htmlFor="auto-text-style">{translateUI("Stile testo automatico")}</label><Switch id="auto-text-style" checked={autoTextStyle} disabled={generating} onCheckedChange={onAutoTextStyleChange} aria-describedby="auto-text-style-help" /></div><p id="auto-text-style-help" className="text-xs text-muted-foreground">{translateUI("L’AI sceglie font, dimensioni e colori adatti alla foto, senza sfondi dietro alle scritte. Disattiva per conservare lo stile personalizzato. Le posizioni spostate da te restano fisse.")}</p></div>}
    <fieldset data-tour="studio-platform" disabled={generating}>
      <legend className="text-sm font-medium mb-2">{translateUI("Dove vuoi pubblicare")}</legend>
      <div className="grid grid-cols-2 gap-2">{['Instagram','Facebook'].map(p => <button key={p} type="button" aria-pressed={String(platform).toLowerCase() === p.toLowerCase()} onClick={() => setPlatform(p)}
        className={['rounded-xl border py-3 text-xs font-medium', String(platform).toLowerCase() === p.toLowerCase() ? 'border-purple bg-accent text-foreground' : 'border-border hover:bg-secondary'].join(' ')}>{p}</button>)}</div>
    </fieldset>
    <div data-tour="studio-tone"><label htmlFor="post-tone" className="text-sm font-medium block mb-2">{translateUI("Tono del testo")}</label><AppSelect id="post-tone" value={tone} onChange={event => setTone(event.target.value)} disabled={generating} className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm">{Object.entries(POST_TONES).map(([value, label]) => <option key={value} value={value}>{translateUI(label)}</option>)}</AppSelect></div>
    <div className="space-y-3 pt-4 border-t border-border">
      <div><label htmlFor="copy-headline" className="text-sm font-medium">{translateUI("Titolo sulla foto")}</label>
        <Input id="copy-headline" value={copy?.headline || ''} maxLength={200} disabled={generating} readOnly={imageText || mode === 'graphic'} onChange={e => setCopy({ ...copy, headline: e.target.value })} className="mt-1 rounded-xl" />
        {imageText || mode === 'graphic' ? <p className="text-xs text-muted-foreground mt-2">{translateUI("Per chiedere un’altra scritta usa “Cosa vuoi comunicare?” e premi Rigenera.")}</p> : templateMode ? <p className="text-xs text-muted-foreground mt-2">{translateUI("Le modifiche si vedono subito nell’anteprima.")}</p> : copy?.graphic_url && mode !== 'original' && <p className="text-xs text-muted-foreground mt-2">{translateUI("In questo vecchio post il testo è già dentro l’immagine. Per cambiarlo, rigenera il post.")}</p>}
      </div>
      {templateMode && !imageText && mode !== 'graphic' && <div><label htmlFor="copy-subtitle" className="text-sm font-medium">{translateUI("Sottotitolo sulla foto (facoltativo)")}</label><Textarea id="copy-subtitle" value={copy?.graphic_subtitle || ''} rows={2} maxLength={200} disabled={generating} onChange={e => setCopy({ ...copy, graphic_subtitle: e.target.value })} className="mt-1 rounded-xl" /></div>}
    </div>
  </div>;
}

