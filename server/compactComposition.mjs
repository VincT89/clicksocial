import { FORMATS, fitTextBox, getTemplate } from '../shared/templates.mjs';
import { contains, overlaps, roundBox } from '../shared/compositionGeometry.mjs';
import { elementFootprint, isManualElement } from '../shared/designElements.mjs';
import { emphasisParts, fitStyledText } from '../shared/textTypography.mjs';

const area = box => box.width * box.height;
const distance = (a, b) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

/** Conserva soltanto spazi già dichiarati tranquilli, sottraendo soggetti ed elementi fissi con i rispettivi margini. */
function subtract(spaces, obstacles, gap) {
  for (const obstacle of obstacles) {
    const cut = { x: obstacle.x - gap, y: obstacle.y - gap, width: obstacle.width + gap * 2, height: obstacle.height + gap * 2 };
    const pieces = spaces.flatMap(box => {
      if (!overlaps(box, cut)) return [box];
      const right = box.x + box.width, bottom = box.y + box.height;
      return [
        { ...box, width: Math.min(right, cut.x) - box.x },
        { ...box, x: Math.max(box.x, cut.x + cut.width), width: right - Math.max(box.x, cut.x + cut.width) },
        { ...box, height: Math.min(bottom, cut.y) - box.y },
        { ...box, y: Math.max(box.y, cut.y + cut.height), height: bottom - Math.max(box.y, cut.y + cut.height) },
      ].filter(item => item.width > .015 && item.height > .015).map(roundBox);
    });
    spaces = pieces.filter((box, index) => !pieces.some((other, j) => j !== index && contains(other, box) && (area(other) > area(box) || j < index))).sort((a, b) => area(b) - area(a)).slice(0, 48);
  }
  return spaces;
}

/** Stima prudente per scegliere i riquadri sul server; il renderer misura poi i caratteri reali, inclusi i font caricati. */
function estimate(line, size) {
  let width = .12;
  for (const char of line) width += /\s/u.test(char) ? .36 : /[ilI.,:;!'’|]/u.test(char) ? .38 : /[mwMW@]/u.test(char) ? 1.1 : /[A-ZÀ-Ü0-9]/u.test(char) ? .88 : .74;
  return width * size;
}

function textShapes(design, copy, role, space) {
  const format = FORMATS[design.format], base = Math.min(format.width, format.height), heading = role === 'heading';
  const style = design.elements?.[role] || {}, text = heading ? copy.headline : copy.graphic_subtitle;
  const maximum = style.font_size || base * (heading ? .085 : .035);
  const minimum = Math.min(maximum, base * (heading ? .042 : .028));
  const sizes = [...new Set(design.ai_text_style ? [maximum, Math.max(minimum, maximum * .85), Math.max(minimum, maximum * .7), minimum] : [maximum])];
  const emphasis = heading && style.emphasis, rich = emphasis && emphasisParts(text, emphasis).some(part => part.emphasis);
  const shapes = [], widths = [...new Set([space.width, Math.min(space.width, .65), space.width * .8, space.width * .6])];
  for (const size of sizes) for (const width of widths) {
    const rect = { width: width * format.width - 4, height: space.height * format.height - 4 };
    if (rect.width <= 0 || rect.height <= 0) continue;
    try {
      const fitted = rich ? fitStyledText(text, emphasis, rect, (line, pixels) => ({ width: estimate(line, pixels), ascent: pixels * 1.12, descent: pixels * .30 }), { min: size, max: size })
        : fitTextBox(text, rect, estimate, { min: size, max: size, maxLines: 4, lineHeight: 1.4 });
      if (fitted.lines.length > 4) continue;
      const height = ((rich ? fitted.height : fitted.lines.length * fitted.lineHeight) + 4) / format.height;
      shapes.push({ width, height, fontSize: size, cost: (1 - size / maximum) * 2 + fitted.lines.length * .015 });
    } catch { /** Uno spazio troppo piccolo viene scartato, senza troncare o riscrivere il contenuto. */ }
  }
  return shapes;
}

function logoShapes(design, current) {
  const format = FORMATS[design.format], base = Math.min(format.width, format.height), box = current.logo;
  const minimum = Math.min(1, Math.max(base * .14 / (box.width * format.width), base * .06 / (box.height * format.height)));
  return [...new Set([1, Math.max(minimum, .85), Math.max(minimum, .7)])].map(scale => ({ width: box.width * scale, height: box.height * scale, cost: (1 - scale) * .5 }));
}

function optionsFor(design, copy, role, spaces, current) {
  const options = [];
  for (const space of spaces) {
    const shapes = role === 'logo' ? logoShapes(design, current) : textShapes(design, copy, role, space);
    for (const shape of shapes) {
      const right = space.x + space.width - shape.width, bottom = space.y + space.height - shape.height;
      if (right < space.x || bottom < space.y) continue;
      const xs = [...new Set([space.x, right, Math.min(right, Math.max(space.x, current[role].x))])];
      const ys = [...new Set([space.y, bottom, Math.min(bottom, Math.max(space.y, current[role].y))])];
      for (const x of xs) for (const y of ys) {
        const box = roundBox({ x, y, width: shape.width, height: shape.height });
        if (contains(space, elementFootprint(design, role, box))) options.push({ box, fontSize: shape.fontSize, score: shape.cost + distance(box, current[role]) * .08 });
      }
    }
  }
  return options;
}

/** La ricerca limitata evita combinazioni esplosive; titolo, supporto e logo possono occupare spazi distinti. */
export function compactComposition(design, copy, regions, roles, current, clear) {
  const top = design.format === '9:16' ? .10 : .055, bottom = design.format === '9:16' ? .87 : .945;
  let spaces = regions.quiet_regions.map(box => {
    const x = Math.max(.055, box.x + .008), y = Math.max(top, box.y + .008);
    return { x, y, width: Math.min(.945, box.x + box.width - .008) - x, height: Math.min(bottom, box.y + box.height - .008) - y };
  }).filter(box => box.width > .015 && box.height > .015);
  spaces = subtract(spaces, regions.protected_regions, .018);
  const locked = roles.filter(role => isManualElement(design.elements?.[role]));
  const boxes = Object.fromEntries(locked.map(role => [role, current[role]]));
  let states = [{ boxes, fontSizes: {}, score: 0 }];
  for (const role of roles.filter(role => !locked.includes(role))) {
    const next = [];
    for (const state of states) {
      const available = subtract(spaces, Object.entries(state.boxes).map(([key, box]) => elementFootprint(design, key, box)), .012);
      for (const option of optionsFor(design, copy, role, available, current)) {
        const selected = { ...state.boxes, [role]: option.box };
        if (!clear(Object.keys(selected), selected)) continue;
        const heading = selected.heading, subtitle = selected.subtitle;
        const relation = role === 'subtitle' && heading ? (subtitle.y < heading.y ? .4 : 0) + Math.abs(subtitle.x - heading.x) * .1 : 0;
        next.push({ boxes: selected, fontSizes: { ...state.fontSizes, ...(option.fontSize && design.ai_text_style ? { [role]: option.fontSize } : {}) }, score: state.score + option.score + relation });
      }
    }
    const seen = new Set();
    states = next.sort((a, b) => a.score - b.score).filter(state => {
      const key = JSON.stringify([state.boxes, state.fontSizes]);
      if (seen.has(key)) return false;
      seen.add(key); return true;
    }).slice(0, 24);
    if (!states.length) return null;
  }
  return states[0] ? { ...states[0], align: getTemplate(design.template_id, design.template_version).textAlign } : null;
}
