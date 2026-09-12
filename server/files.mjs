import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fail, now, uid } from './store.mjs';

export function sniffImage(bytes) {
  if (bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return 'image/png';
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.subarray(0,4).toString() === 'RIFF' && bytes.subarray(8,12).toString() === 'WEBP') return 'image/webp';
  if (['GIF87a','GIF89a'].includes(bytes.subarray(0,6).toString())) return 'image/gif';
  fail(400, 'Carica una vera immagine JPEG, PNG, WebP o GIF.');
}
export async function saveImage(db, config, user, bytes, name = 'immagine') {
  if (!bytes.length || bytes.length > 15 * 1024 * 1024) fail(400, 'Immagine vuota o superiore a 15 MB.');
  const mime = sniffImage(bytes);
  const id = uid();
  writeFileSync(join(config.dataDir, 'uploads', id), bytes, { flag: 'wx' });
  try { await db.prepare('INSERT INTO files VALUES (?,?,?,?,?,?)').run(id, user.id, mime, String(name).slice(0,200), bytes.length, now()); }
  catch (error) { unlinkSync(join(config.dataDir, 'uploads', id)); throw error; }
  return { file_url: '/api/files/' + id };
}
export async function ownedFile(db, config, user, url) {
  if (typeof url !== 'string') fail(400, 'Immagine mancante.');
  let target;
  try { target = new URL(url, config.origin); } catch { fail(400, 'Indirizzo immagine non valido.'); }
  if (target.origin !== new URL(config.origin).origin || !/^\/api\/files\/[a-f0-9-]{36}$/.test(target.pathname)) fail(400, 'Usa una foto caricata in questa installazione.');
  const row = (await db.prepare('SELECT * FROM files WHERE id=?').get(target.pathname.split('/').pop()));
  if (!row || (row.user_id !== user.id && user.role !== 'admin')) fail(404, 'Immagine non trovata.');
  try { return { ...row, bytes: readFileSync(join(config.dataDir, 'uploads', row.id)) }; }
  catch (error) { if (error.code === 'ENOENT') fail(404,'Il file immagine non è più presente. Caricalo di nuovo.'); throw error; }
}

export async function ownedImage(db, config, user, url) {
  const file = await ownedFile(db, config, user, url);
  if (!file.mime.startsWith('image/')) fail(400, 'Questo file non è un’immagine.');
  return file;
}
export async function ownedFont(db, config, user, url) {
  const file = await ownedFile(db, config, user, url);
  if (!['font/woff2', 'font/woff', 'font/ttf', 'font/otf'].includes(file.mime)) fail(400, 'Questo file non è un carattere.');
  return file;
}
export function sniffFont(bytes) {
  if (bytes.length < 12 || bytes.length > 5 * 1024 * 1024) fail(400, 'Usa un font WOFF2, WOFF, TTF o OTF fino a 5 MB.');
  const tag = bytes.subarray(0, 4).toString('ascii');
  const compressedValid = bytes.length >= 44 && bytes.readUInt32BE(8) === bytes.length && bytes.readUInt16BE(12) > 0 && bytes.readUInt16BE(12) <= 128 && bytes.readUInt32BE(16) >= 12 && bytes.readUInt32BE(16) <= 20 * 1024 * 1024;
  if (tag === 'wOF2' && bytes.length >= 48 && compressedValid) return 'font/woff2';
  if (tag === 'wOFF' && compressedValid) return 'font/woff';
  if ((tag === 'OTTO' || bytes.readUInt32BE(0) === 0x00010000) && bytes.readUInt16BE(4) > 0 && bytes.length >= 12 + bytes.readUInt16BE(4) * 16) {
    for (let i = 0; i < bytes.readUInt16BE(4); i++) {
      const offset = bytes.readUInt32BE(12 + i * 16 + 8), size = bytes.readUInt32BE(12 + i * 16 + 12);
      if (offset + size > bytes.length) fail(400, 'Il file del carattere è incompleto.');
    }
    return tag === 'OTTO' ? 'font/otf' : 'font/ttf';
  }
  fail(400, 'Il file non contiene un font WOFF2, WOFF, TTF o OTF valido.');
}
export async function saveFont(db, config, user, bytes, name = 'carattere') {
  const mime = sniffFont(bytes), id = uid();
  writeFileSync(join(config.dataDir, 'uploads', id), bytes, { flag: 'wx' });
  try { await db.prepare('INSERT INTO files VALUES (?,?,?,?,?,?)').run(id, user.id, mime, String(name).slice(0, 200), bytes.length, now()); }
  catch (error) { unlinkSync(join(config.dataDir, 'uploads', id)); throw error; }
  return { file_url: '/api/files/' + id };
}
