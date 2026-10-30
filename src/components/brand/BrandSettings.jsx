import { useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import LogoUpload from '@/components/LogoUpload';
import { COLOR_ROLES, LOGO_VARIANTS, BUILTIN_FONTS, normalizeColor } from '../../../shared/brand.mjs';
import { api } from '@/api/client';
import { ensureFont } from '@/lib/templateRenderer';
import { toast } from 'sonner';

const selectClass = 'min-h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm';
export default function BrandSettings({ value, onChange, onBusyChange, showFonts = true }) {
  const id = useId(), [uploading, setUploading] = useState('');
  const changeLogo = (key, patch) => onChange({ ...value, logos: { ...value.logos, [key]: { ...value.logos[key], ...patch } } });
  const changeFont = (key, patch) => onChange({ ...value, fonts: { ...value.fonts, [key]: { ...value.fonts[key], ...patch } } });
  const changeColor = (index, color) => onChange({ ...value, colors: value.colors.map((c, n) => n === index ? color : c) });
  const uploadFont = async (key, event) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || uploading) return;
    if (!/\.(woff2?|ttf|otf)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) { toast.error('Usa un font WOFF2, WOFF, TTF o OTF fino a 5 MB.'); return; }
    setUploading(key); onBusyChange(true);
    try {
      const { file_url } = await api.brand.uploadFont(file);
      const font = { family: file.name.replace(/\.[^.]+$/, '').slice(0, 80), url: file_url, weight: 400 };
      await ensureFont(font); changeFont(key, font); toast.success('Carattere caricato');
    } catch (e) { toast.error('Caricamento non riuscito: ' + e.message); }
    finally { setUploading(''); onBusyChange(false); }
  };
  return <div className="space-y-7">
    <div><h3 className="font-heading text-lg">Loghi</h3><p className="text-sm text-muted-foreground mt-1">Carica le varianti disponibili, anche una sola. ClickSocial sceglierà quella leggibile sullo sfondo del template.</p></div>
    <div data-tour="brand-logos" className="grid gap-5 lg:grid-cols-3">{Object.entries(LOGO_VARIANTS).map(([key, label]) => <div key={key} className="min-w-0 space-y-3 rounded-lg border border-border p-4">
      <LogoUpload label={label} logoUrl={value.logos[key].url} background={value.logos[key].background} light={key === 'light'} onChange={url => changeLogo(key, { url })} onBusyChange={onBusyChange} />
      <Label htmlFor={id + key}>Sfondo del file</Label><select id={id + key} className={selectClass} value={value.logos[key].background} onChange={e => changeLogo(key, { background: e.target.value })}>
        <option value="auto">Rimuovi automaticamente</option><option value="none">Conserva originale / trasparente</option><option value="white">Rimuovi fondo bianco</option><option value="black">Rimuovi fondo nero</option>
      </select>
    </div>)}</div>
    <p className="text-xs text-muted-foreground">La pulizia rimuove il fondo uniforme collegato ai bordi e conserva i dettagli interni del marchio. Controlla l’anteprima; per loghi complessi usa il file trasparente originale.</p>
    <fieldset data-tour="brand-colors" className="space-y-3"><legend className="font-heading text-lg mb-2">Colori del brand</legend>
      <p id={id + '-color-help'} className="text-sm text-muted-foreground">Inserisci i quattro colori in HEX, come #FF8000, oppure in RGB, come rgb(255, 128, 0) o 255, 128, 0. I valori RGB vengono convertiti in HEX e passati automaticamente all’AI.</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{COLOR_ROLES.map((role, i) => <div key={role} className="space-y-2"><Label htmlFor={id + '-color-' + i}>{role}</Label><div className="flex gap-2 min-w-0">
        <input type="color" aria-label={'Selettore colore ' + role} className="h-11 w-12 shrink-0 rounded border border-input bg-background p-1" value={normalizeColor(value.colors[i]) || '#FFFFFF'} onChange={e => changeColor(i, e.target.value.toUpperCase())} />
        <Input id={id + '-color-' + i} className="min-w-0" value={value.colors[i]} maxLength={64} required autoCapitalize="off" autoComplete="off" spellCheck={false} aria-describedby={id + '-color-help'}
          ref={node => node?.setCustomValidity(normalizeColor(value.colors[i]) ? '' : 'Inserisci un HEX come #FF8000 oppure tre valori RGB da 0 a 255, come 255, 128, 0.')}
          onChange={e => changeColor(i, e.target.value)} onBlur={e => { const color = normalizeColor(e.target.value); if (color) changeColor(i, color); }} />
      </div></div>)}</div>
      <p className="text-xs text-muted-foreground">ClickSocial sceglie un colore leggibile dalla palette o, se necessario, bianco o nero. Sulla foto può schiarire o scurire leggermente il fondo sotto testi e logo. I codici della palette vengono conservati.</p>
    </fieldset>
    {showFonts && <fieldset data-tour="brand-fonts" className="space-y-4"><legend className="font-heading text-lg mb-2">Caratteri aziendali</legend>
      <div className="grid sm:grid-cols-2 gap-5">{[['heading', 'Font dei titoli'], ['body', 'Font dei testi']].map(([key, label]) => <div key={key} className="min-w-0 space-y-3">
        <Label htmlFor={id + key}>{label}</Label><select id={id + key} className={selectClass} value={value.fonts[key].url ? 'custom' : value.fonts[key].family} onChange={e => changeFont(key, { family: e.target.value, url: '', weight: key === 'heading' ? 700 : 400 })}>
          {BUILTIN_FONTS.map(name => <option key={name} value={name}>{name}</option>)}{value.fonts[key].url && <option value="custom">{value.fonts[key].family} (caricato)</option>}
        </select>
        <Label htmlFor={id + key + '-file'}>{uploading === key ? 'Caricamento…' : 'Carica un carattere personalizzato'}</Label>
        <input id={id + key + '-file'} type="file" accept=".woff2,.woff,.ttf,.otf" aria-label={key === 'heading' ? 'Carica un font per i titoli' : 'Carica un font per i testi'} className="block w-full min-w-0 text-sm file:mr-2 file:min-h-11 file:rounded-md file:border file:border-input file:bg-background file:px-3 file:text-foreground" disabled={!!uploading} onChange={e => uploadFont(key, e)} />
        <p className="text-xs text-muted-foreground">WOFF2, WOFF, TTF o OTF, massimo 5 MB. Carica la variante del carattere che vuoi utilizzare.</p>
      </div>)}</div>
    </fieldset>}
  </div>;
}
