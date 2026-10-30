import { useEffect, useId, useRef, useState } from 'react';
import { Slider } from '@/components/ui/slider';
import { RotateCcw, LockKeyhole, LockKeyholeOpen } from 'lucide-react';
import { DEFAULT_FILTERS, PRESETS } from '@/lib/photoPresets';

export default function PhotoAdjustments({ filters, activePreset, onFiltersChange, onPresetChange, disabled = false }) {
  const [unlockedFilters, setUnlockedFilters] = useState([]);
  const sliderRefs = useRef({});
  const filterHelpId = useId();
  const controlsDisabled = disabled;
  useEffect(() => { if (disabled) setUnlockedFilters([]); }, [disabled]);
  const applyPreset = (preset) => {
    if (controlsDisabled) return;
    onFiltersChange({ ...preset.f });
    onPresetChange(preset.name);
  };

  const update = (key, value) => {
    if (controlsDisabled || !unlockedFilters.includes(key)) return;
    onFiltersChange({ ...filters, [key]: value });
    onPresetChange("Personalizzato");
  };

  const reset = () => {
    if (controlsDisabled) return;
    onFiltersChange({ ...DEFAULT_FILTERS });
    onPresetChange("Originale");
  };

  const toggleFilter = (key, event) => {
    if (controlsDisabled) return;
    const unlocking = !unlockedFilters.includes(key);
    setUnlockedFilters(current => unlocking ? [...current, key] : current.filter(item => item !== key));
    if (unlocking && event.detail === 0) requestAnimationFrame(() => {
      const slider = sliderRefs.current[key];
      if (slider && !slider.hasAttribute('data-disabled')) slider.querySelector('[role="slider"]')?.focus();
    });
  };

  const sliders = [
    { key: "brightness", label: "Luminosità", min: 50, max: 150 },
    { key: "contrast", label: "Contrasto", min: 50, max: 160 },
    { key: "saturate", label: "Saturazione", min: 0, max: 200 },
    { key: "warmth", label: "Calore", min: -60, max: 80 },
    { key: "blur", label: "Morbidezza", min: 0, max: 8 },
    { key: "vignette", label: "Vignettatura", min: 0, max: 80 },
  ];

  return <div className="space-y-5">
        <div data-tour="studio-presets">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-foreground">Filtri rapidi</h4>
            <button
              type="button"
              onClick={reset}
              disabled={controlsDisabled}
              className="min-h-11 text-xs text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Ripristina
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.name}
                type="button"
                disabled={controlsDisabled}
                aria-pressed={activePreset === p.name}
                onClick={() => applyPreset(p)}
                className={[
                  "min-h-11 min-w-0 px-2 py-2 rounded-lg text-xs font-medium border",
                  activePreset === p.name
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-card hover:border-foreground/40 text-foreground/80",
                ].join(" ")}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        <section data-tour="studio-filters" aria-label="Regolazioni manuali">
          <p id={filterHelpId} className="mb-4 text-xs leading-relaxed text-muted-foreground">Premi una barra per sbloccarla. Il primo tocco non cambia il valore. Usa il lucchetto per bloccarla di nuovo.</p>
          <div className="grid grid-cols-2 gap-x-5 gap-y-4">
          {sliders.map((s) => {
            const isLocked = !unlockedFilters.includes(s.key);
            const actionLabel = `${isLocked ? 'Sblocca' : 'Blocca'} ${s.label}`;
            const LockIcon = isLocked ? LockKeyhole : LockKeyholeOpen;
            return (
            <div key={s.key}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-muted-foreground">{s.label}</span>
                <span className="text-xs text-foreground/60 tabular-nums">{filters[s.key]}</span>
              </div>
              <div className="relative pr-12">
                <Slider
                ref={node => { sliderRefs.current[s.key] = node; }}
                aria-label={s.label}
                aria-describedby={filterHelpId}
                disabled={isLocked || controlsDisabled}
                value={[filters[s.key]]}
                min={s.min}
                max={s.max}
                step={1}
                className="min-h-11"
                onValueChange={(v) => update(s.key, v[0])}
              />
                <button type="button" aria-label={actionLabel} title={actionLabel} aria-describedby={isLocked ? filterHelpId : undefined} disabled={controlsDisabled} onClick={event => toggleFilter(s.key, event)} className={`absolute inset-y-0 right-0 flex h-11 items-center justify-end rounded-lg pr-3 touch-pan-y hover:bg-secondary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 disabled:cursor-not-allowed ${isLocked ? 'w-full text-muted-foreground' : 'w-11 text-purple'}`}><LockIcon size={18} aria-hidden="true" /></button>
              </div>
            </div>
          ); })}
          </div>
        </section>

  </div>;
}
