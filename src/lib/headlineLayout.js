const graphemes = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter('it', { granularity: 'grapheme' }) : null;

/** Measures and balances the actual title; preview and export share this layout. */
export function layoutHeadline(text, width, height, measure) {
  if (typeof text !== 'string' || ![width, height].every(value => Number.isFinite(value) && value > 0) || typeof measure !== 'function') {
    throw new Error('Il titolo o le dimensioni dell’immagine non sono validi.');
  }
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return null;
  const maxWidth = width * 0.86;

  const atSize = fontSize => {
    const cache = new Map();
    const measured = value => {
      if (!cache.has(value)) cache.set(value, measure(value, fontSize));
      return cache.get(value);
    };
    const tokens = [];
    for (const word of words) {
      if (measured(word) <= maxWidth) { tokens.push(word); continue; }
      const characters = graphemes ? [...graphemes.segment(word)].map(item => item.segment) : [...word];
      let chunk = '';
      for (const character of characters) {
        if (measured(character) > maxWidth) return null;
        if (chunk && measured(chunk + character) > maxWidth) { tokens.push(chunk); chunk = ''; }
        chunk += character;
      }
      if (chunk) tokens.push(chunk);
    }
    const costs = Array(tokens.length + 1).fill(Infinity), next = [];
    costs[tokens.length] = 0;
    for (let start = tokens.length - 1; start >= 0; start--) {
      let line = '';
      for (let end = start; end < tokens.length; end++) {
        line += (line ? ' ' : '') + tokens[end];
        const occupied = measured(line) / maxWidth;
        if (occupied > 1) break;
        const orphan = end === tokens.length - 1 && start === end && tokens.length > 1 && occupied < 0.26 ? 200 : 0;
        const cost = 1000000 + (1 - occupied) ** 2 * 100 + orphan + costs[end + 1];
        if (cost < costs[start]) { costs[start] = cost; next[start] = end + 1; }
      }
    }
    if (!Number.isFinite(costs[0])) return null;
    const lines = [];
    for (let index = 0; index < tokens.length; index = next[index]) lines.push(tokens.slice(index, next[index]).join(' '));
    const lineHeight = fontSize * 1.16;
    const bottomPadding = Math.max(height * 0.04, fontSize * 0.8);
    const bandHeight = lines.length * lineHeight + fontSize * 1.2 + bottomPadding;
    if (bandHeight > height * 0.42) return null;
    return { lines, fontSize, lineHeight, bottomPadding, bandHeight, maxWidth };
  };

  let low = 1, high = Math.max(1, Math.floor(Math.min(width * 0.075, height * 0.115))), selected = null;
  while (low <= high) {
    const middle = Math.floor((low + high) / 2);
    const candidate = atSize(middle);
    if (candidate) { selected = candidate; low = middle + 1; }
    else high = middle - 1;
  }
  if (!selected) throw new Error('Questa immagine è troppo piccola per contenere il titolo. Usa una foto più grande.');
  return selected;
}
