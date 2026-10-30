/** Leggiamo solo intestazioni delimitate: nessuna decompressione di immagini ricevute dall’esterno. */
export function imageGeometry(bytes) {
  let width, height, orientation = 1;
  function exif(data) {
    const offset = data.subarray(0, 6).equals(Buffer.from('Exif\0\0')) ? 6 : 0;
    const tiff = data.subarray(offset), little = tiff.subarray(0, 2).toString() === 'II';
    if (tiff.length < 8 || !['II', 'MM'].includes(tiff.subarray(0, 2).toString())) return;
    const u16 = n => little ? tiff.readUInt16LE(n) : tiff.readUInt16BE(n);
    const u32 = n => little ? tiff.readUInt32LE(n) : tiff.readUInt32BE(n);
    if (u16(2) !== 42) return;
    const start = u32(4);
    if (start + 2 > tiff.length) return;
    const count = u16(start);
    if (count > 1024 || start + 2 + count * 12 > tiff.length) return;
    for (let i = 0; i < count; i++) {
      const p = start + 2 + i * 12;
      if (u16(p) === 0x112 && u16(p + 2) === 3 && u32(p + 4) === 1) orientation = u16(p + 8);
    }
  }
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
    if (bytes.toString('ascii', 12, 16) !== 'IHDR') throw new Error('Intestazione PNG non valida.');
    width = bytes.readUInt32BE(16); height = bytes.readUInt32BE(20);
    for (let p = 8; p + 12 <= bytes.length;) {
      const size = bytes.readUInt32BE(p), end = p + 12 + size;
      if (end > bytes.length) break;
      if (bytes.toString('ascii', p + 4, p + 8) === 'eXIf') exif(bytes.subarray(p + 8, end - 4));
      p = end;
    }
  } else if (bytes.length >= 10 && ['GIF87a', 'GIF89a'].includes(bytes.subarray(0, 6).toString())) {
    width = bytes.readUInt16LE(6); height = bytes.readUInt16LE(8);
  } else if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    for (let p = 12; p + 8 <= bytes.length;) {
      const tag = bytes.toString('ascii', p, p + 4), size = bytes.readUInt32LE(p + 4), data = p + 8;
      if (data + size > bytes.length) break;
      if (tag === 'VP8X' && size >= 10) { width = 1 + bytes.readUIntLE(data + 4, 3); height = 1 + bytes.readUIntLE(data + 7, 3); }
      if (!width && tag === 'VP8 ' && size >= 10 && bytes.subarray(data + 3, data + 6).equals(Buffer.from([157, 1, 42]))) { width = bytes.readUInt16LE(data + 6) & 0x3fff; height = bytes.readUInt16LE(data + 8) & 0x3fff; }
      if (!width && tag === 'VP8L' && size >= 5 && bytes[data] === 0x2f) { const bits = bytes.readUInt32LE(data + 1); width = (bits & 0x3fff) + 1; height = ((bits >>> 14) & 0x3fff) + 1; }
      if (tag === 'EXIF') exif(bytes.subarray(data, data + size));
      p = data + size + (size % 2);
    }
  } else if (bytes[0] === 255 && bytes[1] === 216) {
    for (let p = 2; p + 1 < bytes.length;) {
      if (bytes[p++] !== 255) break;
      while (bytes[p] === 255) p++;
      const marker = bytes[p++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === 1 || (marker >= 0xd0 && marker <= 0xd7)) continue;
      if (p + 2 > bytes.length) break;
      const size = bytes.readUInt16BE(p);
      if (size < 2 || p + size > bytes.length) break;
      if (marker === 0xe1) exif(bytes.subarray(p + 2, p + size));
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && size >= 8) { height = bytes.readUInt16BE(p + 3); width = bytes.readUInt16BE(p + 5); }
      p += size;
    }
  }
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 100000 || height > 100000 || orientation < 1 || orientation > 8) throw new Error('Non riesco a verificare le dimensioni della foto. Caricala nuovamente in JPEG o PNG.');
  return orientation >= 5 ? { width: height, height: width } : { width, height };
}
