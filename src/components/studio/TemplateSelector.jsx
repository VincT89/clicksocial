import { useId } from 'react';
import { FORMATS, TEMPLATES, getTemplate } from '../../../shared/templates.mjs';

export default function TemplateSelector({ value, onChange, disabled = false }) {
  const id = useId(), format = FORMATS[value.format], current = getTemplate(value.template_id, value.template_version);
  return <fieldset disabled={disabled} className="min-w-0 space-y-4">
    <div data-tour="studio-formats" className="space-y-2"><label htmlFor={id} className="text-sm font-medium">Formato</label><select id={id} value={value.format} onChange={e => onChange({ ...value, format: e.target.value })} className="w-full min-h-11 rounded-md border border-input bg-background px-3 py-2 text-sm">
      {Object.entries(FORMATS).map(([key, f]) => <option key={key} value={key}>{key} · {f.label} · {f.width} × {f.height}</option>)}
    </select></div>
    <div data-tour="studio-templates"><p className="text-sm font-medium mb-2">Posizione di testi e logo</p><div className="grid grid-cols-2 sm:grid-cols-3 gap-2">{TEMPLATES.map(t => {
      const layout = t.layouts[value.format], foreground = '#202C32';
      const selected = value.template_id === t.id && value.template_version === t.version;
      const rect = b => ({ x: b.x * 100, y: b.y * 100, width: b.width * 100, height: b.height * 100 });
      const lines = (area, count, thickness) => Array.from({ length: count }, (_, i) => {
        const width = area.width * (i === count - 1 ? .7 : 1);
        const offset = t.textAlign === 'right' ? area.width - width : t.textAlign === 'center' ? (area.width - width) / 2 : 0;
        return <rect key={i} x={(area.x + offset) * 100} y={(area.y + area.height * (i + .2) / count) * 100} width={width * 100} height={thickness} fill={foreground} />;
      });
      const logoX = (layout.logo.x + layout.logo.width * (t.logoAlign === 'right' ? 1 : t.logoAlign === 'center' ? .5 : 0)) * 100;
      return <button key={t.id} type="button" aria-pressed={selected} aria-label={'Template ' + t.name} title={t.description} onClick={() => onChange({ ...value, template_id: t.id, template_version: t.version })} className={'min-w-0 rounded-lg border p-2 text-left focus-visible:ring-2 focus-visible:ring-ring ' + (selected ? 'border-purple ring-1 ring-purple' : 'border-border')}>
        <div className="h-24 flex items-center justify-center mb-2"><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={'Schema di ' + t.name} style={{ aspectRatio: format.width / format.height, height: '100%', maxWidth: '100%' }}>
          <rect {...rect(layout.photo)} fill="#D6E0DF" />
          <ellipse cx={(layout.subject.x + layout.subject.width / 2) * 100} cy={(layout.subject.y + layout.subject.height / 2) * 100} rx={layout.subject.width * 35} ry={layout.subject.height * 40} fill="#A6B8B5" />
          <text x={(layout.subject.x + layout.subject.width / 2) * 100} y={(layout.subject.y + layout.subject.height / 2) * 100} textAnchor="middle" fill={foreground} fontSize="5">Foto</text>
          {lines(layout.heading, 3, 2)}{lines(layout.subtitle, 2, 1)}
          <text x={logoX} y={(layout.logo.y + layout.logo.height * .75) * 100} textAnchor={t.logoAlign === 'right' ? 'end' : t.logoAlign === 'center' ? 'middle' : 'start'} fill={foreground} fontSize="5">Logo</text>
        </svg></div><span className="block text-xs leading-snug font-medium break-words">{t.name}</span>
      </button>;
    })}</div></div>
    <p className="text-xs text-muted-foreground" aria-live="polite">{current.overlay ? current.description : 'Questo post conserva il template precedente. Scegli uno schema qui sopra per applicare testi e logo sulla foto a pieno sfondo.'}</p>
    <p className="text-xs text-muted-foreground">Scegli lo schema che lascia libero il soggetto della foto. Formato, template e ritaglio si possono cambiare senza nuove chiamate AI.</p>
  </fieldset>;
}
