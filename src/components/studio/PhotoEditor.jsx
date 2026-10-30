import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { acquireImage } from '@/lib/mobile';
import { drawFilteredImage } from '@/lib/photoFilters';
import { layoutHeadline } from '@/lib/headlineLayout';
import { renderTemplate } from '@/lib/templateRenderer';
import { FORMATS } from '../../../shared/templates.mjs';
import { useSize } from '@/hooks/use-size';
import ElementOverlay from './ElementOverlay';
import { api } from "@/api/client";

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

const PhotoEditor = forwardRef(/** @param {{imageUrl:string,headline?:string,subtitle?:string,design?:any,filters:any,disabled?:boolean,onDesignChange?:Function,selectedElement?:string,onSelectElement?:Function,elementLayout?:any,onLayoutChange?:Function}} props */ function PhotoEditor(
  { imageUrl, headline, subtitle = '', design = null, filters, disabled = false, onDesignChange, selectedElement, onSelectElement, elementLayout = {}, onLayoutChange },
  ref
) {
  const [exporting, setExporting] = useState(false);
  const [rendering, setRendering] = useState(false);
  const canvasRef = useRef(null);
  const [loaded, setLoaded] = useState(null);
  const [imageError, setImageError] = useState("");
  const [layoutWarning, setLayoutWarning] = useState('');
  const viewportRef = useRef(null);
  const viewport = useSize(viewportRef);
  const source = loaded?.url === imageUrl ? loaded.image : null;
  const ratio = design ? FORMATS[design.format].width / FORMATS[design.format].height : source ? source.naturalWidth / source.naturalHeight : 1;
  const width = Math.max(0, Math.min(viewport?.width || 0, (viewport?.height || 0) * ratio));
  useEffect(() => {
    let active = true;
    setImageError("");
    setLayoutWarning('');
    onLayoutChange?.({});
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
    if (!source || !canvasRef.current) return;
    let active = true;
    setRendering(true);
    const frame = requestAnimationFrame(async () => {
      try {
        const rendered = document.createElement('canvas');
        const warnings = [];
        let layout = {};
        if (design) await renderTemplate(rendered, source, design, filters, headline, subtitle, { onWarning: message => warnings.push(message), onLayout: value => { layout = value; } });
        else await drawPhoto(rendered, source, filters, headline);
        if (!active || !canvasRef.current) return;
        canvasRef.current.width = rendered.width; canvasRef.current.height = rendered.height;
        canvasRef.current.getContext('2d').drawImage(rendered, 0, 0);
        onLayoutChange?.(layout);
        setImageError('');
        setLayoutWarning([...new Set(warnings)].join(' '));
      }
      catch (error) { if (active) { setImageError(error.message); setLayoutWarning(''); } }
      finally { if (active) setRendering(false); }
    });
    return () => { active = false; cancelAnimationFrame(frame); };
  }, [source, filters, headline, subtitle, design, onLayoutChange]);

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

  return <div data-tour="studio-editor" className="studio-editor" aria-busy={rendering || exporting || !source}>
    <div ref={viewportRef} className="studio-preview-viewport">
      <div className="studio-preview-frame" style={{ width, height: width / ratio }}>
        <canvas ref={canvasRef} role="img" aria-label={headline ? `Anteprima della foto con il titolo: ${headline}` : 'Anteprima della foto'} className={`block h-full w-full ${!source ? 'invisible' : ''}`} />
        {!source && <p role={imageError ? 'alert' : 'status'} className="absolute inset-0 flex items-center justify-center p-4 text-sm text-muted-foreground text-center">{imageError || 'Caricamento dell’anteprima…'}</p>}
        {source && design && !imageError && <ElementOverlay design={design} onChange={onDesignChange} layout={elementLayout} selected={selectedElement} onSelect={onSelectElement} disabled={disabled || exporting} />}
      </div>
    </div>
    {source && imageError && <p role="alert" className="studio-preview-warning">{imageError}</p>}
    {layoutWarning && <details className="studio-preview-warning"><summary>Controlla la leggibilità</summary><p role="status">{layoutWarning}</p></details>}
    {exporting && <p role="status" className="text-xs text-muted-foreground">Esportazione foto…</p>}
  </div>;
});

export default PhotoEditor;
