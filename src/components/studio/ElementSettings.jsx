import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useEffect, useId, useRef, useState } from 'react';
import { api } from '@/api/client';
import { ensureFont } from '@/lib/templateRenderer';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { BUILTIN_FONTS, normalizeColor } from '../../../shared/brand.mjs';
import { designLayout } from '../../../shared/templates.mjs';
import { ELEMENT_LABELS, changeElement, moveBox, scaleElement } from '../../../shared/designElements.mjs';
import { emphasisParts } from '../../../shared/textTypography.mjs';

const fieldClass = 'w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm';

function FontControl({ font, onChange, onBusyChange }) {
  useI18n();
  const id = useId(), mounted = useRef(true), [busy, setBusy] = useState(false);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const upload = async event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy) return;
    if (!/\.(woff2?|ttf|otf)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) { toast.error(translateUI("Usa un font WOFF2, WOFF, TTF o OTF fino a 5 MB.")); return; }
    setBusy(true); onBusyChange(true);
    try {
      const { file_url } = await api.brand.uploadFont(file);
      const next = { family: file.name.replace(/\.[^.]+$/, '').slice(0, 80), url: file_url, weight: 400 };
      await ensureFont(next);
      if (mounted.current) { onChange(next); toast.success(translateUI("Carattere applicato al post")); }
    } catch (error) { if (mounted.current) toast.error(translateUI(error.message)); }
    finally { if (mounted.current) setBusy(false); onBusyChange(false); }
  };
  return <fieldset className="space-y-3" disabled={busy}>
    <div><label htmlFor={id} className="block text-sm mb-1">{translateUI("Font della scritta")}</label><AppSelect id={id} className={fieldClass} value={font.url ? 'custom' : font.family} onChange={event => onChange({ ...font, family: event.target.value, url: '', weight: event.target.value === 'Kaushan Script' ? 400 : font.weight })}>
      {BUILTIN_FONTS.map(family => <option key={family}>{family}</option>)}{font.url && <option value="custom">{font.family} {translateUI("(caricato)")}</option>}
    </AppSelect></div>
    <div><label htmlFor={id + '-weight'} className="block text-sm mb-1">{translateUI("Spessore del carattere")}</label><AppSelect id={id + '-weight'} className={fieldClass} value={font.weight} disabled={!font.url && font.family === 'Kaushan Script'} onChange={event => onChange({ ...font, weight: Number(event.target.value) })}>
      {[[400, 'Normale'], [500, 'Medio'], [600, 'Semigrassetto'], [700, 'Grassetto'], [800, 'Molto marcato']].map(([value, label]) => <option key={value} value={value}>{translateUI(label)}</option>)}
    </AppSelect></div>
    <details><summary className="min-h-11 cursor-pointer py-3 text-sm">{translateUI("Carica un altro font")}</summary><label htmlFor={id + '-file'} className="block text-xs mb-2">{translateUI("WOFF2, WOFF, TTF o OTF, massimo 5 MB")}</label><input id={id + '-file'} type="file" accept=".woff2,.woff,.ttf,.otf" aria-label={translateUI("Carica font della scritta")} className="block w-full min-w-0 text-sm file:mr-2 file:min-h-11" onChange={upload} /></details>
    {busy && <p role="status" className="text-sm">{translateUI("Caricamento del carattere…")}</p>}
  </fieldset>;
}

function ColorField({ value, onChange, label = 'Colore della scritta' }) {
  useI18n();
  const id = useId(), [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  const commit = () => {
    if (draft === value) return;
    const color = normalizeColor(draft);
    if (color) onChange(color);
    else { setDraft(value); toast.error(translateUI("Inserisci un colore HEX o RGB valido.")); }
  };
  return <div><label htmlFor={id} className="block text-sm mb-1">{translateUI(label)}</label><div className="flex gap-2"><input type="color" value={value} aria-label={translateUI("Scegli ") + translateUI(label).toLowerCase()} className="h-11 w-12 shrink-0 rounded border border-input bg-background p-1" onChange={event => onChange(event.target.value.toUpperCase())} /><input id={id} className={fieldClass} value={draft} maxLength={64} autoComplete="off" spellCheck={false} onChange={event => setDraft(event.target.value)} onBlur={commit} onKeyDown={event => { if (event.key === 'Enter') { event.preventDefault(); commit(); } }} /></div></div>;
}

function TextComposition({ role, item, design, headline, patch, onChange }) {
  useI18n();
  const emphasis = item.emphasis, backdrop = item.backdrop || { style: 'auto', color: '#FFF2DC', opacity: .9 };
  const accent = value => patch({ emphasis: { ...emphasis, ...value } });
  const toggle = enabled => {
    if (enabled) patch({ emphasis: { text: String(headline || '').trim().split(/\s+/).at(-1).slice(0, 70), font: 'Kaushan Script', weight: 400, scale: 1.6, color: design.brand.colors[0], separate_line: true } });
    else onChange(current => { const heading = { ...current.elements?.heading }; delete heading.emphasis; return { ...current, elements: { ...current.elements, heading } }; });
  };
  return <fieldset className="space-y-3 border-t pt-3">
    <legend className="text-sm font-medium">{translateUI("Composizione del testo")}</legend>
    {role === 'heading' && <>
      <div className="setting-switch"><label htmlFor="emphasis-enabled">{translateUI("Parola in evidenza")}</label><Switch id="emphasis-enabled" checked={!!emphasis} onCheckedChange={toggle} /></div>
      {emphasis && <div className="space-y-3">
        <div><label htmlFor="emphasis-text" className="block text-sm mb-1">{translateUI("Parola o frase del titolo")}</label><input id="emphasis-text" className={fieldClass} maxLength={70} value={emphasis.text} onChange={event => accent({ text: event.target.value })} /></div>
        {emphasis.text && !emphasisParts(headline, emphasis).some(part => part.emphasis) && <p className="text-xs text-muted-foreground">{translateUI("Questa parola non è presente nel titolo: scrivila come appare nella grafica.")}</p>}
        <div><label htmlFor="emphasis-font" className="block text-sm mb-1">{translateUI("Font della parola")}</label><AppSelect id="emphasis-font" className={fieldClass} value={emphasis.font} onChange={event => accent({ font: event.target.value, weight: event.target.value === 'Kaushan Script' ? 400 : emphasis.weight })}>{BUILTIN_FONTS.map(font => <option key={font}>{font}</option>)}<option value="heading">{translateUI("Come il titolo")}</option><option value="body">{translateUI("Come il testo di supporto")}</option></AppSelect></div>
        <div><label htmlFor="emphasis-scale" className="block text-sm mb-1">{translateUI("Dimensione della parola:")} {Math.round(emphasis.scale * 100)}%</label><input id="emphasis-scale" className="w-full h-11" type="range" min="50" max="300" step="5" value={emphasis.scale * 100} onChange={event => accent({ scale: Number(event.target.value) / 100 })} /></div>
        <div><label htmlFor="emphasis-weight" className="block text-sm mb-1">{translateUI("Spessore della parola")}</label><AppSelect id="emphasis-weight" className={fieldClass} value={emphasis.weight} disabled={emphasis.font === 'Kaushan Script'} onChange={event => accent({ weight: Number(event.target.value) })}>{[[400, 'Normale'], [500, 'Medio'], [600, 'Semigrassetto'], [700, 'Grassetto'], [800, 'Molto marcato']].map(([value, label]) => <option key={value} value={value}>{translateUI(label)}</option>)}</AppSelect></div>
        <ColorField label={translateUI("Colore della parola")} value={emphasis.color === 'auto' ? design.brand.colors[0] : emphasis.color} onChange={color => accent({ color })} />
        <div className="setting-switch"><label htmlFor="emphasis-line">{translateUI("Parola su una riga dedicata")}</label><Switch id="emphasis-line" checked={emphasis.separate_line} onCheckedChange={checked => accent({ separate_line: checked })} /></div>
      </div>}
    </>}
    {!design.transparent_overlays && <div><label htmlFor="text-backdrop" className="block text-sm mb-1">{translateUI("Sfondo della scritta")}</label><AppSelect id="text-backdrop" className={fieldClass} value={backdrop.style} onChange={event => patch({ backdrop: { ...backdrop, style: event.target.value } })}><option value="auto">{translateUI("Contrasto automatico")}</option><option value="none">{translateUI("Nessuno")}</option><option value="brush">{translateUI("Pennellata")}</option></AppSelect></div>}
    {!design.transparent_overlays && backdrop.style === 'brush' && <>
      <ColorField label={translateUI("Colore della pennellata")} value={backdrop.color} onChange={color => patch({ backdrop: { ...backdrop, color } })} />
      <div><label htmlFor="text-backdrop-opacity" className="block text-sm mb-1">{translateUI("Intensità della pennellata:")} {Math.round(backdrop.opacity * 100)}%</label><input id="text-backdrop-opacity" className="w-full h-11" type="range" min="0" max="100" step="1" value={backdrop.opacity * 100} onChange={event => patch({ backdrop: { ...backdrop, opacity: Number(event.target.value) / 100 } })} /></div>
      <p className="text-xs text-muted-foreground">{translateUI("La pennellata segue le dimensioni del riquadro. Spostando o ingrandendo il titolo, si muove insieme alle scritte.")}</p>
    </>}
  </fieldset>;
}

export default function ElementSettings({ design, onChange, selected, onSelect, layout, onBusyChange, copy, onCopyChange }) {
  useI18n();
  const embedded = design.text_mode === 'image';
  const role = embedded ? 'logo' : selected || 'heading', item = design.elements?.[role] || {};
  const box = Number.isFinite(item.x) ? item : layout[role]?.box || designLayout(design)[role];
  const fontSize = item.font_size || layout[role]?.fontSize || (role === 'heading' ? 72 : 36);
  const patch = value => onChange(current => changeElement(current, role, value));
  const scale = factor => onChange(current => scaleElement(current, role, box, factor, fontSize));
  const fontKey = role === 'heading' ? 'heading' : 'body';
  const backdropOpacity = Math.round((item.backdrop_opacity ?? layout.logo?.backdropOpacity ?? 0) * 100);
  const resetBackdrop = () => onChange(current => {
    const logo = { ...current.elements?.logo }; delete logo.backdrop_opacity; delete logo.backdrop_size;
    return { ...current, elements: { ...current.elements, logo } };
  });
  const reset = () => onChange(current => {
    const elements = { ...current.elements }; delete elements[role];
    return { ...current, elements };
  });
  return <section className="space-y-4" aria-label={translateUI("Modifica elementi")}>
    {embedded && <p className="text-sm text-muted-foreground">{translateUI("Le scritte fanno parte della grafica AI. Per cambiarle, aggiorna “Cosa vuoi comunicare?” e premi Rigenera. Il logo resta spostabile e ridimensionabile.")}</p>}
    {!design.transparent_overlays && <div className="space-y-2"><p className="text-xs text-muted-foreground">{translateUI("Questo post conserva le impostazioni precedenti degli sfondi.")}</p><button type="button" className="min-h-11 text-sm underline" onClick={() => onChange(current => ({ ...current, transparent_overlays: true }))}>{translateUI("Rimuovi sfondi da testo e logo")}</button></div>}
    <div><label htmlFor="studio-element" className="block text-sm font-medium mb-2">{translateUI("Elemento da modificare")}</label><AppSelect id="studio-element" className={fieldClass} value={role} onChange={event => onSelect(event.target.value)}>{Object.entries(ELEMENT_LABELS).filter(([key]) => !embedded || key === 'logo').map(([key, label]) => <option value={key} key={key}>{translateUI(label)}</option>)}</AppSelect></div>
    {role !== 'logo' && <div><label htmlFor="element-text" className="block text-sm mb-1">{role === 'heading' ? translateUI("Titolo grafica") : translateUI("Testo di supporto")}</label><textarea id="element-text" className={fieldClass} rows={2} maxLength={200} value={copy?.[role === 'heading' ? 'headline' : 'graphic_subtitle'] || ''} onChange={event => onCopyChange({ ...copy, [role === 'heading' ? 'headline' : 'graphic_subtitle']: event.target.value })} /></div>}
    {role === 'logo' && !Object.values(design.brand.logos).some(logo => logo.url) ? <p className="text-sm text-muted-foreground">{translateUI("Carica il logo nella sezione “Loghi e colori del post” qui sotto.")}</p> : <>
      <div className="grid grid-cols-2 gap-3">{[['x', 'Orizzontale'], ['y', 'Verticale']].map(([key, label]) => <div key={key}><label htmlFor={'element-' + key} className="block text-sm mb-1">{translateUI(label)} (%)</label><input id={'element-' + key} className={fieldClass} type="number" inputMode="decimal" min="0" max={(100 * (1 - box[key === 'x' ? 'width' : 'height'])).toFixed(1)} step="0.1" value={+(box[key] * 100).toFixed(1)} onChange={event => { if (event.target.value !== '' && Number.isFinite(event.target.valueAsNumber)) patch(moveBox(box, key === 'x' ? event.target.valueAsNumber / 100 : box.x, key === 'y' ? event.target.valueAsNumber / 100 : box.y)); }} /></div>)}</div>
      <div><label htmlFor="element-width" className="block text-sm mb-1">{translateUI("Larghezza nella grafica:")} {+(box.width * 100).toFixed(1)}%</label><input id="element-width" type="range" min="1" max="100" step="0.5" value={box.width * 100} className="w-full h-11" onChange={event => scale(Number(event.target.value) / 100 / box.width)} /></div>
      {role === 'logo' && !design.transparent_overlays && <fieldset className="space-y-3 border-t pt-3">
        <legend className="text-sm font-medium">{translateUI("Sfondo del logo")}</legend>
        <div><label htmlFor="logo-backdrop-opacity" className="block text-sm mb-1">{translateUI("Intensità dello sfondo:")} {backdropOpacity}%{item.backdrop_opacity === undefined ? translateUI(" (automatica)") : ''}</label><input id="logo-backdrop-opacity" type="range" min="0" max="100" step="1" value={backdropOpacity} className="w-full h-11" onChange={event => patch({ backdrop_opacity: Number(event.target.value) / 100 })} /></div>
        <div><label htmlFor="logo-backdrop-size" className="block text-sm mb-1">{translateUI("Dimensione dello sfondo:")} {Math.round((item.backdrop_size || 1) * 100)}%</label><input id="logo-backdrop-size" type="range" min="50" max="250" step="5" value={(item.backdrop_size || 1) * 100} className="w-full h-11" onChange={event => patch({ backdrop_size: Number(event.target.value) / 100 })} /></div>
        <p className="text-xs text-muted-foreground">{translateUI("A 0% di intensità lo sfondo è trasparente. Il logo mantiene le sue dimensioni e i suoi colori.")}</p>
        <button type="button" onClick={resetBackdrop} className="min-h-11 text-sm underline underline-offset-4">{translateUI("Ripristina sfondo automatico")}</button>
      </fieldset>}
      {role !== 'logo' && <>
        <div><label htmlFor="element-font-size" className="block text-sm mb-1">{translateUI("Dimensione del testo (pixel)")}</label><input id="element-font-size" className={fieldClass} type="number" min="12" max="600" step="1" value={Math.round(fontSize)} onChange={event => { const value = event.target.valueAsNumber; if (value >= 12 && value <= 600) scale(value / fontSize); }} /></div>
        <FontControl key={role} font={design.brand.fonts[fontKey]} onBusyChange={onBusyChange} onChange={font => onChange(current => ({ ...current, brand: { ...current.brand, fonts: { ...current.brand.fonts, [fontKey]: font } } }))} />
        <ColorField value={item.color && item.color !== 'auto' ? item.color : layout[role]?.color || design.brand.colors[0]} onChange={color => patch({ color })} />
        <div className="setting-switch"><label htmlFor="element-auto-color">{translateUI("Scegli automaticamente un colore leggibile")}</label><Switch id="element-auto-color" checked={!item.color || item.color === 'auto'} onCheckedChange={checked => patch({ color: checked ? 'auto' : layout[role]?.color || design.brand.colors[0] })} /></div>
        <div><label htmlFor="element-align" className="block text-sm mb-1">{translateUI("Allineamento")}</label><AppSelect id="element-align" className={fieldClass} value={item.align || layout[role]?.align || 'left'} onChange={event => patch({ align: event.target.value })}><option value="left">{translateUI("Sinistra")}</option><option value="center">{translateUI("Centro")}</option><option value="right">{translateUI("Destra")}</option></AppSelect></div>
        <TextComposition role={role} item={item} design={design} headline={copy?.headline} patch={patch} onChange={onChange} />
      </>}
      <button type="button" onClick={reset} className="min-h-11 text-sm underline underline-offset-4">{translateUI("Ripristina posizione e stile di")} {translateUI(ELEMENT_LABELS[role]).toLowerCase()}</button>
    </>}
    <p className="text-xs text-muted-foreground">{translateUI("Le modifiche valgono per questo post. Puoi spostare gli elementi anche sulla foto e ingrandirli dalla maniglia nell’angolo.")}</p>
  </section>;
}
