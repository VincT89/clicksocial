const brushes = new Map();

/** La maschera deterministica viene riutilizzata durante il trascinamento, senza ricalcolare i pixel. */
export function drawTextBrush(ctx, box, { color, opacity }) {
  if (!opacity) return;
  const width = Math.ceil(box.width), height = Math.ceil(box.height), key = `${width}:${height}:${color}`;
  let layer = brushes.get(key);
  if (!layer) {
    layer = document.createElement('canvas'); layer.width = width; layer.height = height;
    const brush = layer.getContext('2d'), pixels = brush.createImageData(width, height);
    const channels = [1, 3, 5].map(index => parseInt(color.slice(index, index + 2), 16));
    const smooth = value => { const t = Math.min(1, Math.max(0, value)); return t * t * (3 - 2 * t); };
    const top = [], bottom = [];
    for (let x = 0; x < width; x++) {
      const u = x / width;
      top[x] = .065 + .025 * Math.sin(u * 9) + .025 * u + .004 * Math.sin(x * .37);
      bottom[x] = .935 - .026 * Math.sin(u * 7 + .5) - .025 * u + .004 * Math.sin(x * .43);
    }
    for (let y = 0; y < height; y++) {
      const v = y / height, taper = (2 * v - 1) ** 2;
      const left = .025 + .075 * taper + .013 * Math.sin(y * .43) + .012 * Math.sin(y * 1.73);
      const right = .97 - .085 * taper + .016 * Math.sin(y * .31) + .014 * Math.sin(y * 1.37);
      for (let x = 0; x < width; x++) {
        const u = x / width, edge = Math.min((u - left) / .055, (right - u) / .07, (v - top[x]) / .055, (bottom[x] - v) / .055);
        let hash = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263); hash = Math.imul(hash ^ (hash >>> 13), 1274126177);
        const grain = ((hash ^ (hash >>> 16)) >>> 0) / 4294967295;
        const alpha = smooth(edge + (grain - .5) * .22) * (.94 + grain * .06);
        const offset = (y * width + x) * 4;
        for (let channel = 0; channel < 3; channel++) pixels.data[offset + channel] = channels[channel];
        pixels.data[offset + 3] = Math.round(alpha * 255);
      }
    }
    brush.putImageData(pixels, 0, 0);
    if (brushes.size >= 4) brushes.delete(brushes.keys().next().value);
    brushes.set(key, layer);
  }
  /** La pittura rimane dentro l’area riservata, anche quando le misure contengono frazioni di pixel. */
  ctx.save(); ctx.globalAlpha = opacity; ctx.drawImage(layer, box.x, box.y, box.width, box.height); ctx.restore();
}

export function brushTextBox(box) {
  return { x: box.x + box.width * .10, y: box.y + box.height * .18, width: box.width * .80, height: box.height * .65 };
}
