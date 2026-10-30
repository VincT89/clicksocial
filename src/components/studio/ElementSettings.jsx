import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/api/client';
import { ensureFont } from '@/lib/templateRenderer';
import { toast } from 'sonner';
import { BUILTIN_FONTS, normalizeColor } from '../../../shared/brand.mjs';
import { designLayout } from '../../../shared/templates.mjs';
import { ELEMENT_LABELS, changeElement, moveBox, scaleElement } from '../../../shared/designElements.mjs';

const fieldClass = 'w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm';

function FontControl({ font, onChange, onBusyChange }) {
  const id = useId(), mounted = useRef(true), [busy, setBusy] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!/\.(woff2?|ttf|otf)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) { toast.error('Usa un font WOFF2, WOFF, TTF o OTF fino a 5 MB.'); return; }
    setBusy(true); onBusyChange(true);
    try {
      const { file_url } = await api.brand.uploadFont(file);
      const next = { family: file.name.replace(/\.[^.]+$/, '').slice(0, 80), url: file_url, weight: 400 };
      await ensureFont(next);
      if (mounted.current) { onChange(next); toast.success('Carattere applicato al post'); }
    } catch (error) { if (mounted.current) toast.error(error.message); }
    finally { if (mounted.current) setBusy(false); onBusyChange(false); }
  };
  return <fieldset className="space-y-3" disabled={busy}>
    <div><label htmlFor={id} className="block text-sm mb-1">Font della scritta</label><select id={id} className={fieldClass} value={font.url ? 'custom' : font.family} onChange={event => onChange({ ...font, family: event.target.value, url: '' })}>
      {BUILTIN_FONTS.map(family => <option key={family}>{family}</option>)}{font.url && <option value="custom">{font.family} (caricato)</option>}
    </select></div>
    <div><label htmlFor={id + '-weight'} className="block text-sm mb-1">Spessore del carattere</label><select id={id + '-weight'} className={fieldClass} value={font.weight} onChange={event => onChange({ ...font, weight: Number(event.target.value) })}>
      {[[400, 'Normale'], [500, 'Medio'], [600, 'Semigrassetto'], [700, 'Grassetto'], [800, 'Molto marcato']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
    </select></div>
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm">Carica un altro font</summary><label htmlFor={id + '-file'} className="block text-xs mb-2">WOFF2, WOFF, TTF o OTF, massimo 5 MB</label><input id={id + '-file'} type="file" accept=".woff2,.woff,.ttf,.otf" aria-label="Carica font della scritta" className="block w-full min-w-0 text-sm file:mr-2 file:min-h-11" onChange={upload} /></details>
    {busy && <p role="status" className="text-sm">Caricamento del carattere…</p>}
  </fieldset>;
}

function ColorField({ value, onChange }) {
  const id = useId(), [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) return;
    const color = normalizeColor(draft);
    if (color) onChange(color);
    else { setDraft(value); toast.error('Inserisci un colore HEX o RGB valido.'); }
  };
  return <div><label htmlFor={id} className="block text-sm mb-1">Colore della scritta</label><div className="flex gap-2"><input type="color" value={value} aria-label="Scegli colore della scritta" className="h-11 w-12 shrink-0 rounded border border-input bg-background p-1" onChange={event => onChange(event.target.value.toUpperCase())} /><input id={id} className={fieldClass} value={draft} maxLength={64} autoComplete="off" spellCheck={false} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} /></div></div>;
}

export default function ElementSettings({ design, onChange, selected, onSelect, layout, onBusyChange, copy, onCopyChange }) {
  const role = selected || 'heading', item = design.elements?.[role] || {};
  const box = Number.isFinite(item.x) ? item : layout[role]?.box || designLayout(design)[role];
  const fontSize = item.font_size || layout[role]?.fontSize || (role === 'heading' ? 72 : 36);
  const patch = value => onChange(current => changeElement(current, role, value));
  const scale = factor => onChange(current => scaleElement(current, role, box, factor, fontSize));
  const fontKey = role === 'heading' ? 'heading' : 'body';
  const reset = () => onChange(current => {
    const elements = { ...current.elements }; delete elements[role];
    return { ...current, elements };
  });
  return <section className="space-y-4" aria-label="Modifica elementi">
    <div><label htmlFor="studio-element" className="block text-sm font-medium mb-2">Elemento da modificare</label><select id="studio-element" className={fieldClass} value={role} onChange={event => onSelect(event.target.value)}>{Object.entries(ELEMENT_LABELS).map(([key, label]) => <option value={key} key={key}>{label}</option>)}</select></div>
    {role !== 'logo' && <div><label htmlFor="element-text" className="block text-sm mb-1">{role === 'heading' ? 'Titolo grafica' : 'Testo di supporto'}</label><textarea id="element-text" className={fieldClass} rows={2} maxLength={200} value={copy?.[role === 'heading' ? 'headline' : 'graphic_subtitle'] || ''} onChange={event => onCopyChange({ ...copy, [role === 'heading' ? 'headline' : 'graphic_subtitle']: event.target.value })} /></div>}
    {role === 'logo' && !Object.values(design.brand.logos).some(logo => logo.url) ? <p className="text-sm text-muted-foreground">Carica il logo nella sezione “Loghi e colori del post” qui sotto.</p> : <>
      <div className="grid grid-cols-2 gap-3">{[['x', 'Orizzontale'], ['y', 'Verticale']].map(([key, label]) => <div key={key}><label htmlFor={'element-' + key} className="block text-sm mb-1">{label} (%)</label><input id={'element-' + key} className={fieldClass} type="number" inputMode="decimal" min="0" max={(100 * (1 - box[key === 'x' ? 'width' : 'height'])).toFixed(1)} step="0.1" value={+(box[key] * 100).toFixed(1)} onChange={event => { if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) patch(moveBox(box, key === 'x' ? event.target.valueAsNumber / 100 : box.x, key === 'y' ? event.target.valueAsNumber / 100 : box.y)); }} /></div>)}</div>
      <div><label htmlFor="element-width" className="block text-sm mb-1">Larghezza nella grafica: {+(box.width * 100).toFixed(1)}%</label><input id="element-width" type="range" min="1" max="100" step="0.5" value={box.width * 100} className="w-full h-11" onChange={event => scale(Number(event.target.value) / 100 / box.width)} /></div>
      {role !== 'logo' && <>
        <div><label htmlFor="element-font-size" className="block text-sm mb-1">Dimensione del testo (pixel)</label><input id="element-font-size" className={fieldClass} type="number" min="12" max="600" step="1" value={Math.round(fontSize)} onChange={event => { const value = event.target.valueAsNumber; if (value >= 12 && value <= 600) scale(value / fontSize); }} /></div>
        <FontControl key={role} font={design.brand.fonts[fontKey]} onBusyChange={onBusyChange} onChange={font => onChange(current => ({ ...current, brand: { ...current.brand, fonts: { ...current.brand.fonts, [fontKey]: font } } }))} />
        <ColorField value={item.color && item.color !== 'auto' ? item.color : layout[role]?.color || design.brand.colors[0]} onChange={color => patch({ color })} />
        <label className="flex items-center gap-3 min-h-11 text-sm"><input type="checkbox" checked={!item.color || item.color === 'auto'} onChange={event => patch({ color: event.target.checked ? 'auto' : layout[role]?.color || design.brand.colors[0] })} />Scegli automaticamente un colore leggibile</label>
        <div><label htmlFor="element-align" className="block text-sm mb-1">Allineamento</label><select id="element-align" className={fieldClass} value={item.align || layout[role]?.align || 'left'} onChange={event => patch({ align: event.target.value })}><option value="left">Sinistra</option><option value="center">Centro</option><option value="right">Destra</option></select></div>
      </>}
      <button type="button" onClick={reset} className="min-h-11 text-sm underline underline-offset-4">Ripristina posizione e stile di {ELEMENT_LABELS[role].toLowerCase()}</button>
    </>}
    <p className="text-xs text-muted-foreground">Le modifiche valgono per questo post. Puoi spostare gli elementi anche sulla foto e ingrandirli dalla maniglia nell’angolo.</p>
  </section>;
}
