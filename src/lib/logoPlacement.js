// Rettangolo scelto dall'AI, con coordinate relative alla grafica finale.
export function validateLogoPlacement(value) {
  if (!value || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(value[key]))) {
    throw new Error('La posizione del logo non è valida. Genera di nuovo la grafica.');
  }
  const { x, y, width, height, background } = value;
  if (x < 0.03 || y < 0.03 || width < 0.08 || width > 0.32 || height < 0.04 || height > 0.22 ||
    x + width > 0.97 + 1e-9 || y + height > 0.97 + 1e-9 || !['none', 'light', 'dark'].includes(background)) {
    throw new Error('Il posizionamento del logo supera i limiti della grafica. Genera di nuovo la grafica.');
  }
  return { x, y, width, height, background };
}

export function fitLogoPlacement(placement, imageWidth, imageHeight, logoWidth, logoHeight) {
  const box = validateLogoPlacement(placement);
  if (![imageWidth, imageHeight, logoWidth, logoHeight].every(value => Number.isFinite(value) && value > 0)) {
    throw new Error('Le dimensioni del logo o della grafica non sono valide.');
  }
  const boxWidth = imageWidth * box.width, boxHeight = imageHeight * box.height;
  const padding = box.background === 'none' ? 0 : Math.min(boxWidth, boxHeight) * 0.1;
  const scale = Math.min((boxWidth - padding * 2) / logoWidth, (boxHeight - padding * 2) / logoHeight);
  const width = logoWidth * scale, height = logoHeight * scale;
  return {
    x: imageWidth * box.x + (boxWidth - width) / 2,
    y: imageHeight * box.y + (boxHeight - height) / 2,
    width, height, padding, background: box.background,
  };
}

const CLEARANCE = 0.02;
export function overlapsProtectedContent(box, regions) {
  return regions.some(region => box.x < region.x + region.width + CLEARANCE && box.x + box.width > region.x - CLEARANCE &&
    box.y < region.y + region.height + CLEARANCE && box.y + box.height > region.y - CLEARANCE);
}

/** Validates the visual analysis and relocates a logo that intersects a protected region. */
export function resolveLogoAnalysis(value) {
  const proposed = validateLogoPlacement(value);
  if (!['white', 'black', 'none'].includes(value.logo_background) || !Array.isArray(value.protected_regions) || value.protected_regions.length > 64) {
    throw new Error('L’analisi del logo e delle aree da proteggere è incompleta.');
  }
  const regions = value.protected_regions.map(region => {
    if (!region || !['x', 'y', 'width', 'height'].every(key => Number.isFinite(region[key])) ||
      region.x < 0 || region.y < 0 || region.width <= 0 || region.height <= 0 ||
      region.x + region.width > 1 + 1e-9 || region.y + region.height > 1 + 1e-9) {
      throw new Error('Le aree da proteggere non sono valide.');
    }
    return { x: region.x, y: region.y, width: region.width, height: region.height };
  });
  const points = value.logo_background_points || [];
  if (!Array.isArray(points) || points.length > 64 || points.some(point => !point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.y < 0 || point.x > 1 || point.y > 1)) {
    throw new Error('Le aree dello sfondo del logo non sono valide.');
  }
  let selected = { ...proposed, background: 'none' };
  if (overlapsProtectedContent(selected, regions)) {
    selected = null;
    for (const factor of [1, 0.85, 0.7]) {
      const width = Math.max(0.08, proposed.width * factor), height = Math.max(0.04, proposed.height * factor);
      const xs = [proposed.x, 0.03, 0.97 - width, ...regions.flatMap(r => [r.x - width - CLEARANCE - 1e-6, r.x + r.width + CLEARANCE + 1e-6])];
      const ys = [proposed.y, 0.03, 0.97 - height, ...regions.flatMap(r => [r.y - height - CLEARANCE - 1e-6, r.y + r.height + CLEARANCE + 1e-6])];
      let distance = Infinity;
      for (const x of xs) for (const y of ys) {
        const box = { x, y, width, height, background: 'none' };
        if (x < 0.03 || y < 0.03 || x + width > 0.97 + 1e-9 || y + height > 0.97 + 1e-9 || overlapsProtectedContent(box, regions)) continue;
        const candidateDistance = (x - proposed.x) ** 2 + (y - proposed.y) ** 2;
        if (candidateDistance < distance) { selected = box; distance = candidateDistance; }
      }
      if (selected) break;
    }
  }
  if (!selected) throw new Error('Non c’è spazio libero per il logo senza coprire altri elementi. Prova una foto con più spazio attorno al soggetto o una grafica più semplice.');
  return { ...selected, logo_background: value.logo_background, logo_background_points: points.map(({ x, y }) => ({ x, y })), protected_regions: regions };
}
