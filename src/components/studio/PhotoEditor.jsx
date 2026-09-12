import React, { forwardRef, useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import { acquireImage } from '@/lib/mobile';
import { drawFilteredImage } from '@/lib/photoFilters';
import { layoutHeadline } from '@/lib/headlineLayout';
import { renderTemplate } from '@/lib/templateRenderer';
import { FORMATS } from '../../../shared/templates.mjs';
import { Slider } from "@/components/ui/slider";
import { api } from "@/api/client";
import { RotateCcw, Loader2, LockKeyhole, LockKeyholeOpen } from "lucide-react";

export const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturate: 100,
  warmth: 0,
  blur: 0,
  vignette: 0,
};

export const PRESETS = [
  { name: "Originale", f: { ...DEFAULT_FILTERS } },
  { name: "Vivace", f: { brightness: 105, contrast: 112, saturate: 145, warmth: 8, blur: 0, vignette: 0 } },
  { name: "Caldo", f: { brightness: 104, contrast: 104, saturate: 118, warmth: 38, blur: 0, vignette: 12 } },
  { name: "Freddo", f: { brightness: 102, contrast: 110, saturate: 108, warmth: -28, blur: 0, vignette: 0 } },
  { name: "BN", f: { brightness: 102, contrast: 112, saturate: 0, warmth: 0, blur: 0, vignette: 0 } },
  { name: "Vintage", f: { brightness: 106, contrast: 92, saturate: 80, warmth: 30, blur: 0, vignette: 28 } },
  { name: "Drammatico", f: { brightness: 96, contrast: 140, saturate: 120, warmth: 0, blur: 0, vignette: 35 } },
  { name: "Soft", f: { brightness: 108, contrast: 94, saturate: 96, warmth: 12, blur: 0, vignette: 0 } },
];

async function drawPhoto(canvas, source, filters, headline) {
  const scale = Math.min(1, 1620 / Math.max(source.naturalWidth, source.naturalHeight));
  const w = Math.max(1, Math.round(source.naturalWidth * scale));
  const h = Math.max(1, Math.round(source.naturalHeight * scale));
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Il browser non riesce a preparare l’immagine.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  await drawFilteredImage(ctx, source, w, h, filters);
  if (filters.vignette > 0) {
    const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.72);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${(filters.vignette / 100) * 0.75})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
  if (headline?.trim()) {
    // Lo stesso disegno viene usato per l’anteprima e per il file salvato.
    const layout = layoutHeadline(headline, w, h, (text, size) => {
      ctx.font = `700 ${size}px "Bricolage Grotesque", "Arial Black", sans-serif`;
      return ctx.measureText(text).width;
    });
    const { lines, fontSize: fs, lineHeight: lh, bottomPadding: pad, bandHeight: bandH } = layout;
    ctx.font = `700 ${fs}px "Bricolage Grotesque", "Arial Black", sans-serif`;
    const band = ctx.createLinearGradient(0, h - bandH, 0, h);
    band.addColorStop(0, "rgba(0,0,0,0)");
    band.addColorStop(0.35, "rgba(0,0,0,0.45)");
    band.addColorStop(1, "rgba(0,0,0,0.8)");
    ctx.fillStyle = band;
    ctx.fillRect(0, h - bandH, w, bandH);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = 'alphabetic';
    lines.forEach((line, i) => ctx.fillText(line, w / 2, h - pad - fs * 0.22 - (lines.length - 1 - i) * lh));
  }
}

const PhotoEditor = forwardRef(/** @param {{imageUrl:string,headline?:string,subtitle?:string,design?:any,filters:any,activePreset:any,onFiltersChange:Function,onPresetChange:Function,disabled?:boolean}} props */ function PhotoEditor(
  { imageUrl, headline, subtitle = '', design = null, filters, activePreset, onFiltersChange, onPresetChange, disabled = false },
  ref
) {
  const [exporting, setExporting] = useState(false);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(null);
  const [imageError, setImageError] = useState("");
  const [layoutWarning, setLayoutWarning] = useState('');
  const [unlockedFilters, setUnlockedFilters] = useState([]);
  const sliderRefs = useRef({});
  const filterHelpId = useId();
  const source = loaded?.url === imageUrl ? loaded.image : null;
  const controlsDisabled = disabled || exporting || !source || !!imageError;

  useEffect(() => {
    let active = true;
    setImageError("");
    setLayoutWarning('');
    setUnlockedFilters([]);
    const image = new Image();
    image.crossOrigin = "anonymous";
    let release = () => {};
    image.onload = async () => {
      await document.fonts.ready;
      if (active) setLoaded({ url: imageUrl, image });
    };
    image.onerror = () => {
      if (active) setImageError("La foto non è disponibile. Riapri il post o carica di nuovo l’immagine.");
    };
    acquireImage(imageUrl).then(result => {
      release = result.release;
      if (active) image.src = result.url;
      else release();
    }).catch(error => { if (active) setImageError(error.message); });
    return () => { active = false; image.onload = null; image.onerror = null; release(); };
  }, [imageUrl]);

  useEffect(() => {
    if (disabled) setUnlockedFilters([]);
  }, [disabled]);

  useEffect(() => {
    if (!source || !canvasRef.current) return;
    let active = true;
    const frame = requestAnimationFrame(async () => {
      try {
        const rendered = document.createElement('canvas');
        const warnings = [];
        if (design) await renderTemplate(rendered, source, design, filters, headline, subtitle, { onWarning: message => warnings.push(message) });
        else await drawPhoto(rendered, source, filters, headline);
        if (!active || !canvasRef.current) return;
        canvasRef.current.width = rendered.width; canvasRef.current.height = rendered.height;
        canvasRef.current.getContext('2d').drawImage(rendered, 0, 0);
        setImageError('');
        setLayoutWarning(warnings.join(' '));
      }
      catch (error) { if (active) { setImageError(error.message); setLayoutWarning(''); } }
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [source, filters, headline, subtitle, design]);

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

  useImperativeHandle(ref, () => ({
    async exportImage() {
      setExporting(true);
      try {
        if (!source?.complete || !source.naturalWidth) throw new Error("Attendi il caricamento della foto prima di salvare.");
        await document.fonts.ready;
        const canvas = document.createElement("canvas");
        if (design) await renderTemplate(canvas, source, design, filters, headline, subtitle);
        else await drawPhoto(canvas, source, filters, headline);
        const mime = design ? 'image/png' : 'image/jpeg';
        const blob = await new Promise((res) => canvas.toBlob(res, mime, 0.92));
        if (!blob) throw new Error("Impossibile esportare la foto. Riprova.");
        const file = new File([blob], design ? 'clicksocial.png' : 'clicksocial.jpg', { type: mime });
        const { file_url } = await api.integrations.Core.UploadFile({ file });
        return file_url;
      } finally {
        setExporting(false);
      }
    },
    isExporting: () => exporting,
    getFilters: () => filters,
  }));

  const sliders = [
    { key: "brightness", label: "Luminosità", min: 50, max: 150 },
    { key: "contrast", label: "Contrasto", min: 50, max: 160 },
    { key: "saturate", label: "Saturazione", min: 0, max: 200 },
    { key: "warmth", label: "Calore", min: -60, max: 80 },
    { key: "blur", label: "Morbidezza", min: 0, max: 8 },
    { key: "vignette", label: "Vignettatura", min: 0, max: 80 },
  ];

  return (
    <div data-tour="studio-editor" className="space-y-6 min-w-0">
      <div style={{ aspectRatio: design ? FORMATS[design.format].width / FORMATS[design.format].height : 1 }} className="relative w-full rounded-xl overflow-hidden bg-foreground/[0.04] flex items-center justify-center max-h-[640px]">
        <canvas ref={canvasRef} role="img" aria-label={headline ? `Anteprima della foto con il titolo: ${headline}` : "Anteprima della foto"} className={`block w-full h-full object-contain ${!source || imageError ? "invisible" : ""}`} />
        {(!source || imageError) && <p role={imageError ? "alert" : "status"} className="absolute inset-0 flex items-center justify-center p-6 text-sm text-muted-foreground text-center">{imageError || "Caricamento dell’anteprima…"}</p>}
      </div>
      {layoutWarning && <p role="status" className="text-sm leading-relaxed text-muted-foreground">{layoutWarning}</p>}

      <div className="flex flex-col gap-5">
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

        {exporting && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Esportazione foto…
          </div>
        )}
      </div>
    </div>
  );
});

export default PhotoEditor;
