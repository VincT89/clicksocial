export const rgb = hex => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16));
const linear = value => { const v = value / 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; };
const light = color => linear(color[0]) * .2126 + linear(color[1]) * .7152 + linear(color[2]) * .0722;

// Campioni della foto sotto agli elementi, prima di disegnarli. Non analizza semanticamente i soggetti.
export function overlayScore(pairs, tint = [0, 0, 0], opacity = 0, percentile = 0) {
  if (!pairs.length) return 0;
  const scores = pairs.map(({ ink, paper, alpha = 1, coverage = 1 }) => {
    const shade = opacity * coverage;
    const background = paper.map((v, i) => v * (1 - shade) + tint[i] * shade);
    const a = light(ink.map((v, i) => v * alpha + background[i] * (1 - alpha))), b = light(background);
    return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
  }).sort((a, b) => a - b);
  return scores[Math.floor((scores.length - 1) * percentile)];
}

export function backdropFor(pairs, target = 4.5, percentile = 0) {
  if (overlayScore(pairs, [0, 0, 0], 0, percentile) >= target) return { tint: '#000000', opacity: 0 };
  let best = null;
  for (const tint of ['#000000', '#FFFFFF']) {
    const color = rgb(tint);
    // Mantiene visibile la fotografia; non introduce un pannello opaco.
    if (overlayScore(pairs, color, .72, percentile) < target) continue;
    let low = 0, high = .72;
    for (let i = 0; i < 9; i++) {
      const mid = (low + high) / 2;
      if (overlayScore(pairs, color, mid, percentile) >= target) high = mid; else low = mid;
    }
    if (!best || high < best.opacity) best = { tint, opacity: high };
  }
  return best;
}

export function logoTreatment(pairs, opacity) {
  const target = 3, percentile = .05;
  if (Number.isFinite(opacity)) {
    const best = ['#000000', '#FFFFFF'].map(tint => ({ tint, opacity, score: overlayScore(pairs, rgb(tint), opacity, percentile) })).sort((a, b) => b.score - a.score)[0];
    return { ...best, sufficient: best.score >= target };
  }
  const treatment = backdropFor(pairs, target, percentile);
  if (treatment) return { ...treatment, score: overlayScore(pairs, rgb(treatment.tint), treatment.opacity, percentile), sufficient: true };
  // Un marchio multicolore o traslucido può non raggiungere la soglia con nessun fondo.
  // Cerca comunque la correzione migliore, senza bloccare il disegno o ricolorare il marchio.
  let best = { tint: '#000000', opacity: 0, score: overlayScore(pairs, [0, 0, 0], 0, percentile), sufficient: false };
  for (let step = 1; step <= 24; step++) for (const tint of ['#000000', '#FFFFFF']) {
    const opacity = step * .03, score = overlayScore(pairs, rgb(tint), opacity, percentile);
    if (score >= target) return { tint, opacity, score, sufficient: true };
    if (score > best.score + .001) best = { tint, opacity, score, sufficient: false };
  }
  return best;
}

export function textTreatment(pixels, palette) {
  const colors = [...new Set([...palette, '#FFFFFF', '#000000'])];
  const options = colors.map((color, index) => {
    const ink = rgb(color), treatment = backdropFor(pixels.map(paper => ({ ink, paper })));
    return treatment ? { ...treatment, color, index } : null;
  }).filter(Boolean);
  const direct = options.find(option => option.opacity === 0);
  if (direct) return direct;
  // Preferisce i colori del brand quando richiedono una correzione simile del fondo.
  return options.sort((a, b) => (a.opacity + a.index * .015) - (b.opacity + b.index * .015))[0];
}
