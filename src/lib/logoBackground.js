const BACKGROUNDS = ['auto', 'none', 'white', 'black'];

/** Removes a flat white/black matte connected to the canvas edge, preserving enclosed artwork. */
export function removeLogoBackground(pixels, width, height, requested = 'auto', backgroundPoints = []) {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || pixels.length !== width * height * 4 || !BACKGROUNDS.includes(requested)) {
    throw new Error('Impossibile leggere lo sfondo del logo.');
  }
  if (requested === 'none') return { background: 'none', removedPixels: 0 };
  const edge = [];
  for (let x = 0; x < width; x++) { edge.push(x); if (height > 1) edge.push((height - 1) * width + x); }
  for (let y = 1; y < height - 1; y++) { edge.push(y * width); if (width > 1) edge.push(y * width + width - 1); }
  const distance = (index, matte) => Math.max(Math.abs(pixels[index * 4] - matte), Math.abs(pixels[index * 4 + 1] - matte), Math.abs(pixels[index * 4 + 2] - matte));
  const visible = edge.filter(index => pixels[index * 4 + 3] > 245);
  // Existing transparency must not be mistaken for the white/black elements of the mark.
  if (!visible.length || (requested === 'auto' && visible.length < edge.length * 0.9)) return { background: 'none', removedPixels: 0 };
  const white = visible.filter(index => distance(index, 255) <= 24).length;
  const black = visible.filter(index => distance(index, 0) <= 24).length;
  const background = requested === 'auto' ? (white >= black ? 'white' : 'black') : requested;
  const count = background === 'white' ? white : black;
  if (count < visible.length * (requested === 'auto' ? 0.55 : 0.25)) return { background: 'none', removedPixels: 0 };
  const matte = background === 'white' ? 255 : 0;
  const visited = new Uint8Array(width * height);
  const queue = new Int32Array(width * height);
  let head = 0, tail = 0, removedPixels = 0;
  const visit = index => {
    if (visited[index] || (pixels[index * 4 + 3] > 8 && distance(index, matte) > 32)) return;
    visited[index] = 1; queue[tail++] = index;
  };
  edge.forEach(visit);
  // The visual analysis may identify enclosed background, such as the counter of a letter.
  for (const point of backgroundPoints) {
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y) || point.x < 0 || point.x > 1 || point.y < 0 || point.y > 1) continue;
    visit(Math.round(point.y * (height - 1)) * width + Math.round(point.x * (width - 1)));
  }
  while (head < tail) {
    const index = queue[head++], x = index % width, y = Math.floor(index / width);
    if (pixels[index * 4 + 3] > 0) removedPixels++;
    pixels[index * 4 + 3] = 0;
    if (x > 0) visit(index - 1);
    if (x + 1 < width) visit(index + 1);
    if (y > 0) visit(index - width);
    if (y + 1 < height) visit(index + width);
  }
  // Unmatte antialiased edge pixels so a white/black fringe does not follow the logo.
  for (let index = 0; index < visited.length; index++) {
    if (visited[index] || pixels[index * 4 + 3] === 0) continue;
    const x = index % width, y = Math.floor(index / width);
    const adjacent = (x > 0 && visited[index - 1]) || (x + 1 < width && visited[index + 1]) || (y > 0 && visited[index - width]) || (y + 1 < height && visited[index + width]);
    const delta = distance(index, matte);
    if (!adjacent || delta > 100 || delta === 0) continue;
    const alpha = delta / 255;
    for (let channel = 0; channel < 3; channel++) {
      const offset = index * 4 + channel;
      pixels[offset] = Math.max(0, Math.min(255, Math.round((pixels[offset] - matte * (1 - alpha)) / alpha)));
    }
    pixels[index * 4 + 3] = Math.round(pixels[index * 4 + 3] * alpha);
  }
  return { background, removedPixels };
}
