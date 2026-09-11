import { overlapsProtectedContent, resolveLogoAnalysis } from './logoPlacement.js';

const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
const GAP = 0.020001;

/** Uses the visible mark's aspect ratio, rather than an arbitrarily shaped container.
 * @param {(box: {x:number, y:number, width:number, height:number}) => number} [appearance]
 */
export function selectLogoPlacement(analysis, imageWidth, imageHeight, logoWidth, logoHeight, appearance = () => 0) {
  if (![imageWidth, imageHeight, logoWidth, logoHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Le dimensioni del logo o della grafica non sono valide.');
  }
  const proposed = resolveLogoAnalysis(analysis);
  const regions = proposed.protected_regions;
  const shortSide = Math.min(imageWidth, imageHeight);
  const marginX = Math.max(0.03, shortSide * 0.05 / imageWidth);
  const marginY = Math.max(0.03, shortSide * 0.05 / imageHeight);
  const targetScale = Math.min(
    Math.sqrt(imageWidth * imageHeight * 0.022 / (logoWidth * logoHeight)),
    imageWidth * 0.32 / logoWidth,
    imageHeight * 0.20 / logoHeight,
  );
  const centerX = proposed.x + proposed.width / 2;
  const centerY = proposed.y + proposed.height / 2;
  let selected = null, bestScore = -Infinity;

  const positions = (axis, size, margin, center) => {
    const dimension = axis === 'x' ? 'width' : 'height';
    const end = 1 - margin - size;
    const values = [center - size / 2, ...[0, 0.25, 0.5, 0.75, 1].map(f => margin + (end - margin) * f)];
    for (const region of regions) values.push(
      region[axis], region[axis] + region[dimension] - size,
      region[axis] + (region[dimension] - size) / 2,
      region[axis] - size - GAP, region[axis] + region[dimension] + GAP,
    );
    return [...new Set(values.map(value => clamp(value, margin, end)))];
  };
  const metrics = (values, axis, size, margin) => values.map(value => {
    const dimension = axis === 'x' ? 'width' : 'height';
    const edge = Math.min(value - margin, 1 - margin - value - size);
    let alignment = edge;
    for (const region of regions) alignment = Math.min(alignment, Math.abs(value - region[axis]), Math.abs(value + size - region[axis] - region[dimension]));
    return { value, edge, alignment };
  });

  for (const factor of [1, 0.9, 0.8]) {
    const width = logoWidth * targetScale * factor / imageWidth;
    const height = logoHeight * targetScale * factor / imageHeight;
    const xs = metrics(positions('x', width, marginX, centerX), 'x', width, marginX);
    const ys = metrics(positions('y', height, marginY, centerY), 'y', height, marginY);
    // Keep candidates from every part of the image, not only near the AI proposal.
    // The bounded shortlist limits pixel analysis on mobile devices.
    const buckets = Array.from({ length: 9 }, () => []);
    for (const column of xs) for (const row of ys) {
      const x = column.value, y = row.value;
      const box = { x, y, width, height };
      if (overlapsProtectedContent(box, regions)) continue;
      const distance = Math.hypot(x + width / 2 - centerX, y + height / 2 - centerY);
      const edgeDistance = Math.min(column.edge, row.edge);
      const alignment = Math.min(column.alignment, row.alignment);
      const geometry = -distance - edgeDistance * 0.4 - alignment * 0.5;
      const bucket = buckets[Math.min(2, Math.floor((y + height / 2) * 3)) * 3 + Math.min(2, Math.floor((x + width / 2) * 3))];
      if (bucket.length === 8 && geometry <= bucket[bucket.length - 1].geometry) continue;
      bucket.push({ box, geometry });
      bucket.sort((a, b) => b.geometry - a.geometry);
      if (bucket.length > 8) bucket.pop();
    }
    for (const { box, geometry } of buckets.flat()) {
      const visualScore = appearance(box);
      if (!Number.isFinite(visualScore)) continue;
      const score = visualScore + geometry * 0.6 - (1 - factor) * 2.6;
      if (score > bestScore) { selected = box; bestScore = score; }
    }
  }
  if (!selected) throw new Error('Non c’è spazio sufficiente per un logo leggibile senza coprire altri elementi. Prova una grafica con più spazio libero.');
  return { x: selected.x * imageWidth, y: selected.y * imageHeight,
    width: selected.width * imageWidth, height: selected.height * imageHeight, padding: 0, background: 'none' };
}

const linear = Array.from({ length: 256 }, (_, value) => {
  const srgb = value / 255;
  return srgb <= 0.04045 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
});
const luminance = (data, index) => linear[data[index]] * 0.2126 + linear[data[index + 1]] * 0.7152 + linear[data[index + 2]] * 0.0722;

/** Scores existing backgrounds with the actual colours and transparent silhouette of the mark. */
export function createLogoAppearanceScorer(graphic, logo) {
  for (const image of [graphic, logo]) {
    if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || image.width < 1 || image.height < 1 || image.data?.length !== image.width * image.height * 4) {
      throw new Error('Impossibile analizzare il contrasto del logo.');
    }
  }
  const background = new Float32Array(graphic.width * graphic.height);
  for (let index = 0; index < background.length; index++) background[index] = luminance(graphic.data, index * 4);
  const samples = [];
  let totalWeight = 0;
  for (let y = 0; y < logo.height; y++) for (let x = 0; x < logo.width; x++) {
    const index = (y * logo.width + x) * 4;
    const alpha = logo.data[index + 3] / 255;
    if (alpha < 0.25) continue;
    samples.push({ x: (x + 0.5) / logo.width, y: (y + 0.5) / logo.height, alpha, light: luminance(logo.data, index) });
    totalWeight += alpha;
  }
  if (!totalWeight) throw new Error('Il logo è troppo trasparente per valutarne la leggibilità.');
  const at = (x, y) => background[clamp(Math.floor(y * graphic.height), 0, graphic.height - 1) * graphic.width + clamp(Math.floor(x * graphic.width), 0, graphic.width - 1)];
  return box => {
    let visibleWeight = 0, contrast = 0;
    for (const sample of samples) {
      const behind = at(box.x + sample.x * box.width, box.y + sample.y * box.height);
      const mark = sample.light * sample.alpha + behind * (1 - sample.alpha);
      const ratio = (Math.max(mark, behind) + 0.05) / (Math.min(mark, behind) + 0.05);
      if (ratio >= 2.2) visibleWeight += sample.alpha;
      contrast += Math.min(3, Math.log2(ratio)) * sample.alpha;
    }
    let texture = 0, pairs = 0;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 6; x++) {
      const light = at(box.x + (x + 0.5) / 6 * box.width, box.y + (y + 0.5) / 6 * box.height);
      if (x) { texture += Math.abs(light - at(box.x + (x - 0.5) / 6 * box.width, box.y + (y + 0.5) / 6 * box.height)); pairs++; }
      if (y) { texture += Math.abs(light - at(box.x + (x + 0.5) / 6 * box.width, box.y + (y - 0.5) / 6 * box.height)); pairs++; }
    }
    return visibleWeight / totalWeight * 5 + contrast / totalWeight * 0.9 - texture / pairs * 5;
  };
}
