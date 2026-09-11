let canvasFiltersSupported;

function supportsCanvasFilters() {
  if (canvasFiltersSupported !== undefined) return canvasFiltersSupported;
  const source = document.createElement('canvas'); source.width = source.height = 1;
  const input = source.getContext('2d'); input.fillStyle = '#ff0000'; input.fillRect(0, 0, 1, 1);
  const target = document.createElement('canvas'); target.width = target.height = 1;
  const output = target.getContext('2d');
  output.filter = 'brightness(0)'; output.drawImage(source, 0, 0);
  canvasFiltersSupported = output.getImageData(0, 0, 1, 1).data[0] === 0;
  return canvasFiltersSupported;
}

export const filterCss = f => [
  `brightness(${f.brightness}%)`, `contrast(${f.contrast}%)`, `saturate(${f.saturate}%)`,
  f.warmth > 0 ? `sepia(${f.warmth}%)` : `hue-rotate(${f.warmth}deg)`,
  f.blur > 0 ? `blur(${f.blur}px)` : '',
].filter(Boolean).join(' ');

// WKWebView non supporta Canvas.filter su tutte le versioni iOS supportate.
// I filtri SVG eseguono la stessa sequenza nello spazio colore sRGB.
export async function drawFilteredImage(ctx, source, width, height, filters, forcePortable = false) {
  if (!forcePortable && supportsCanvasFilters()) {
    ctx.filter = filterCss(filters);
    ctx.drawImage(source, 0, 0, width, height);
    ctx.filter = 'none';
    return;
  }
  const raster = document.createElement('canvas'); raster.width = width; raster.height = height;
  raster.getContext('2d').drawImage(source, 0, 0, width, height);
  const transfer = (slope, intercept = 0) => '<feComponentTransfer>' + ['R', 'G', 'B'].map(c => `<feFunc${c} type="linear" slope="${slope}" intercept="${intercept}"/>`).join('') + '</feComponentTransfer>';
  const amount = filters.warmth / 100;
  const sepia = [1 - .607 * amount, .769 * amount, .189 * amount, 0, 0, .349 * amount, 1 - .314 * amount, .168 * amount, 0, 0, .272 * amount, .534 * amount, 1 - .869 * amount, 0, 0, 0, 0, 0, 1, 0];
  const effects = transfer(filters.brightness / 100) + transfer(filters.contrast / 100, .5 - filters.contrast / 200)
    + `<feColorMatrix type="saturate" values="${filters.saturate / 100}"/>`
    + (filters.warmth > 0 ? `<feColorMatrix type="matrix" values="${sepia.join(' ')}"/>` : `<feColorMatrix type="hueRotate" values="${filters.warmth}"/>`)
    + (filters.blur > 0 ? `<feGaussianBlur stdDeviation="${filters.blur}"/>` : '');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${width}" height="${height}"><defs><filter id="photo" filterUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}" color-interpolation-filters="sRGB">${effects}</filter></defs><image width="${width}" height="${height}" xlink:href="${raster.toDataURL('image/png')}" filter="url(#photo)"/></svg>`;
  const image = new Image();
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error('Non riesco ad applicare i filtri alla foto.'));
    image.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
  ctx.drawImage(image, 0, 0, width, height);
}
