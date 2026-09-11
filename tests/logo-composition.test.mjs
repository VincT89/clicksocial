import test from 'node:test';
import assert from 'node:assert/strict';
import { selectLogoPlacement, createLogoAppearanceScorer } from '../src/lib/logoComposition.js';
import { overlapsProtectedContent } from '../src/lib/logoPlacement.js';

const analysis = { x: 0.07, y: 0.07, width: 0.24, height: 0.12, background: 'none', logo_background: 'none', protected_regions: [] };
const pixels = (width, height, colour) => {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) data.set(colour(x, y), (y * width + x) * 4);
  return { width, height, data };
};

test('composizione: il marchio visibile conserva forma, margini e una dimensione utile sui diversi formati', () => {
  for (const [w, h] of [[1024, 1024], [1620, 1080], [1080, 1620]]) for (const [lw, lh] of [[900, 180], [300, 300], [150, 600]]) {
    const protectedRegions = [{ x: 0.36, y: 0.06, width: 0.58, height: 0.19 }, { x: 0.1, y: 0.4, width: 0.8, height: 0.39 }];
    const placed = selectLogoPlacement({ ...analysis, protected_regions: protectedRegions }, w, h, lw, lh);
    const normalized = { x: placed.x / w, y: placed.y / h, width: placed.width / w, height: placed.height / h };
    assert.ok(Math.abs(placed.width / placed.height - lw / lh) < 1e-9);
    assert.ok(normalized.x >= 0.03 && normalized.y >= 0.03);
    assert.ok(normalized.x + normalized.width <= 0.97 && normalized.y + normalized.height <= 0.97);
    assert.equal(overlapsProtectedContent(normalized, protectedRegions), false);
    assert.ok(placed.width <= w * 0.32 + 1e-9 && placed.height <= h * 0.2 + 1e-9);
    assert.ok(Math.max(placed.width / w, placed.height / h) >= 0.11, 'il logo non deve diventare una firma minuscola');
    assert.equal(placed.background, 'none');
  }
});

test('composizione: un logo scuro preferisce lo spazio chiaro, un logo chiaro lo spazio scuro', () => {
  const graphic = pixels(120, 120, x => x < 60 ? [20, 20, 20, 255] : [245, 245, 245, 255]);
  for (const [colour, expectedSide] of [[[25, 25, 25, 255], 'right'], [[240, 240, 240, 255], 'left']]) {
    const logo = pixels(30, 10, () => colour);
    const original = logo.data.slice();
    const score = createLogoAppearanceScorer(graphic, logo);
    const placed = selectLogoPlacement({ ...analysis, x: expectedSide === 'right' ? 0.06 : 0.7 }, 1024, 1024, 300, 100, score);
    if (expectedSide === 'right') assert.ok(placed.x >= 512);
    else assert.ok(placed.x + placed.width <= 512);
    assert.deepEqual(logo.data, original, 'i colori del logo non vanno modificati per ottenere contrasto');
  }
});

test('composizione: il contrasto considera il disegno trasparente e penalizza lo sfondo movimentato', () => {
  const graphic = pixels(120, 120, (x, y) => x < 60 && (Math.floor(x / 4) + Math.floor(y / 4)) % 2 ? [60, 60, 60, 255] : [245, 245, 245, 255]);
  const logo = pixels(24, 12, (x, y) => y > 3 && y < 9 && x > 2 && x < 22 ? [0, 0, 0, 255] : [255, 255, 255, 0]);
  const score = createLogoAppearanceScorer(graphic, logo);
  const left = { x: 0.06, y: 0.06, width: 0.3, height: 0.15 };
  const right = { ...left, x: 0.64 };
  assert.ok(score(right) > score(left));
  const placed = selectLogoPlacement(analysis, 1024, 1024, 300, 150, score);
  assert.ok(placed.x >= 512);
});

test('composizione: rifiuta spazi che obbligherebbero a rendere minuscolo il marchio', () => {
  assert.throws(() => selectLogoPlacement({ ...analysis, height: 0.05,
    protected_regions: [{ x: 0, y: 0.14, width: 1, height: 0.86 }] }, 1024, 1024, 200, 600), /leggibile/);
  assert.throws(() => selectLogoPlacement(analysis, 0, 1024, 200, 200));
  assert.throws(() => createLogoAppearanceScorer(null, null));
  assert.throws(() => createLogoAppearanceScorer(pixels(2, 2, () => [255, 255, 255, 255]), pixels(2, 2, () => [0, 0, 0, 0])));
});
