import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutHeadline } from '../src/lib/headlineLayout.js';

// A proportional measuring fixture, independent from the browser's chosen font.
const measure = (text, size) => [...text].reduce((total, c) => total + (c === ' ' ? 0.3 : /[ilI.,]/.test(c) ? 0.28 : /[WM]/.test(c) ? 0.95 : 0.56) * size, 0);

test('titoli: adatta il testo a formati diversi senza tagli né invasione dell’intera foto', () => {
  for (const [width, height] of [[1024, 1024], [1620, 1080], [1080, 1620], [320, 568], [1200, 500]]) {
    for (const title of ['Il tuo prossimo progetto', 'Qualità e cura dei dettagli', 'Un titolo molto lungo con tanti dettagli che devono rimanere interamente visibili nella foto senza tagliare le parole o portare il testo oltre i margini previsti per il contenuto da salvare', 'Artigianalità'.repeat(14)]) {
      const layout = layoutHeadline(title, width, height, measure);
      assert.equal(layout.lines.join('').replace(/\s/g, ''), title.replace(/\s/g, ''));
      assert.ok(layout.lines.every(line => measure(line, layout.fontSize) <= width * 0.86 + 1e-9));
      assert.ok(layout.bandHeight <= height * 0.42 + 1e-9);
      assert.ok(layout.bottomPadding > 0 && layout.fontSize > 0);
    }
  }
});

test('titoli: un messaggio breve resta leggibile in anteprima e le righe sono equilibrate', () => {
  const title = 'Progettiamo insieme il tuo futuro';
  const layout = layoutHeadline(title, 1024, 1024, measure);
  assert.ok(layout.fontSize / 1024 * 360 >= 20);
  assert.ok(layout.lines.length <= 3);
  const widths = layout.lines.map(line => measure(line, layout.fontSize));
  assert.ok(Math.min(...widths) / Math.max(...widths) > 0.45);
});

test('titoli: input vuoti o non validi non producono un disegno corrotto', () => {
  assert.equal(layoutHeadline('  ', 1024, 1024, measure), null);
  for (const args of [[null, 100, 100, measure], ['Titolo', 0, 100, measure], ['Titolo', 100, NaN, measure], ['Titolo', 100, 100, null]]) {
    assert.throws(() => layoutHeadline(...args));
  }
});
