const keys = ['x', 'y', 'width', 'height'];
export const roundBox = box => Object.fromEntries(keys.map(key => [key, Math.round(box[key] * 1e6) / 1e6]));
export function validBox(box) {
  return box && typeof box === 'object' && !Array.isArray(box) && keys.every(key => Number.isFinite(box[key])) && box.x >= 0 && box.y >= 0 && box.width > 0 && box.height > 0 && box.x + box.width <= 1.000001 && box.y + box.height <= 1.000001;
}
export function overlaps(a, b, gap = 0) {
  return a.x < b.x + b.width + gap - 1e-6 && a.x + a.width > b.x - gap + 1e-6 && a.y < b.y + b.height + gap - 1e-6 && a.y + a.height > b.y - gap + 1e-6;
}
export function contains(outer, inner) {
  return inner.x >= outer.x - 1e-6 && inner.y >= outer.y - 1e-6 && inner.x + inner.width <= outer.x + outer.width + 1e-6 && inner.y + inner.height <= outer.y + outer.height + 1e-6;
}
export function union(boxes) {
  const x = Math.min(...boxes.map(b => b.x)), y = Math.min(...boxes.map(b => b.y));
  return roundBox({ x, y, width: Math.max(...boxes.map(b => b.x + b.width)) - x, height: Math.max(...boxes.map(b => b.y + b.height)) - y });
}

/** Il soggetto deve avere uno spazio reale anche quando l’utente sposta i riquadri del modello. */
export function freeSubjectArea(reserved, preferred) {
  if (preferred && !reserved.some(b => overlaps(preferred, b))) return preferred;
  const xs = [...new Set([.04, .96, ...reserved.flatMap(b => [b.x, b.x + b.width])])].filter(n => n >= .04 && n <= .96).sort((a, b) => a - b);
  const ys = [...new Set([.04, .96, ...reserved.flatMap(b => [b.y, b.y + b.height])])].filter(n => n >= .04 && n <= .96).sort((a, b) => a - b);
  let best = null, score = 0;
  for (let l = 0; l < xs.length; l++) for (let r = l + 1; r < xs.length; r++) for (let t = 0; t < ys.length; t++) for (let b = t + 1; b < ys.length; b++) {
    const area = roundBox({ x: xs[l], y: ys[t], width: xs[r] - xs[l], height: ys[b] - ys[t] });
    if (area.width < .18 || area.height < .18 || reserved.some(item => overlaps(area, item))) continue;
    const value = area.width * area.height;
    if (value > score) { best = area; score = value; }
  }
  return best;
}
