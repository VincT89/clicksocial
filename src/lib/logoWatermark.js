import { api } from "@/api/client";
import { fitLogoPlacement } from './logoPlacement.js';
import { createLogoAppearanceScorer, selectLogoPlacement } from './logoComposition.js';
import { removeLogoBackground } from './logoBackground.js';
import { acquireImage } from './mobile';

async function loadImage(url) {
  const resource = await acquireImage(url);
  try { return await new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Impossibile caricare il logo o la grafica. Controlla il logo salvato nel Profilo.'));
    img.src = resource.url;
  }); } finally { resource.release(); }
}

/**
 * Sovrappone il logo originale nel rettangolo scelto dall'AI sulla grafica finale.
 * Rimuove il fondo uniforme e mantiene colori e proporzioni del marchio.
 */
export async function applyLogoWatermark(imageUrl, logoUrl, placement) {
  if (!imageUrl || !logoUrl) return imageUrl;
  if (!placement) throw new Error('Il backend non ha restituito il posizionamento del logo. Riavvia l’app aggiornata e riprova.');
    const [img, logo] = await Promise.all([loadImage(imageUrl), loadImage(logoUrl)]);
    const maxSide = 1620;
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * scale);
    const h = Math.round(img.naturalHeight * scale);

    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error('Il browser non riesce a preparare la grafica con il logo.');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);

    // I margini trasparenti del file non devono rendere minuscolo il marchio.
    const sampleScale = Math.min(1, 1024 / Math.max(logo.naturalWidth, logo.naturalHeight));
    const logoCanvas = document.createElement('canvas');
    logoCanvas.width = Math.max(1, Math.round(logo.naturalWidth * sampleScale));
    logoCanvas.height = Math.max(1, Math.round(logo.naturalHeight * sampleScale));
    const logoCtx = logoCanvas.getContext('2d');
    if (!logoCtx) throw new Error('Impossibile leggere il logo.');
    logoCtx.drawImage(logo, 0, 0, logoCanvas.width, logoCanvas.height);
    const logoPixels = logoCtx.getImageData(0, 0, logoCanvas.width, logoCanvas.height);
    const pixels = logoPixels.data;
    removeLogoBackground(pixels, logoCanvas.width, logoCanvas.height, placement.logo_background || 'auto', placement.logo_background_points || []);
    logoCtx.putImageData(logoPixels, 0, 0);
    let left = logoCanvas.width, top = logoCanvas.height, right = -1, bottom = -1;
    for (let y = 0; y < logoCanvas.height; y++) for (let x = 0; x < logoCanvas.width; x++) {
      if (pixels[(y * logoCanvas.width + x) * 4 + 3] > 8) {
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
    }
    if (right < left || bottom < top) throw new Error('Il logo è completamente trasparente. Carica un logo visibile nel Profilo.');
    const sw = right - left + 1, sh = bottom - top + 1;
    let placed;
    if (placement.protected_regions) {
      const sample = (source, sx, sy, width, height, maxEdge) => {
        const sampled = document.createElement('canvas');
        const ratio = Math.min(1, maxEdge / Math.max(width, height));
        sampled.width = Math.max(1, Math.round(width * ratio));
        sampled.height = Math.max(1, Math.round(height * ratio));
        const sampledCtx = sampled.getContext('2d');
        if (!sampledCtx) throw new Error('Impossibile analizzare lo spazio per il logo.');
        sampledCtx.drawImage(source, sx, sy, width, height, 0, 0, sampled.width, sampled.height);
        return sampledCtx.getImageData(0, 0, sampled.width, sampled.height);
      };
      const appearance = createLogoAppearanceScorer(sample(canvas, 0, 0, w, h, 256), sample(logoCanvas, left, top, sw, sh, 48));
      placed = selectLogoPlacement(placement, w, h, sw, sh, appearance);
    } else {
      placed = fitLogoPlacement({ ...placement, background: 'none' }, w, h, sw, sh);
    }
    ctx.drawImage(logoCanvas, left, top, sw, sh, placed.x, placed.y, placed.width, placed.height);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", 0.92));
    if (!blob) throw new Error('Impossibile esportare la grafica con il logo.');
    const file = new File([blob], "clicksocial-creative.jpg", { type: "image/jpeg" });
    const { file_url } = await api.integrations.Core.UploadFile({ file });
    return file_url;
}
