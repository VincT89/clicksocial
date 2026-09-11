import { openDatabase } from './database.mjs';
import { randomUUID, createCipheriv, createDecipheriv, randomBytes, createHmac, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
export const now = () => new Date().toISOString();
export const uid = () => randomUUID();
export function fail(status, message, code) { throw Object.assign(new Error(message), { status, code }); }
export const safeUser = (row) => row && ({ ...JSON.parse(row.profile), id: row.id, email: row.email, role: row.role, plan: row.plan, ai_generations_used: row.ai_used, created_date: row.created_at });
export const openStore = openDatabase;
export const transaction = (db, fn) => db.transaction(fn);
export const digest = (config, value) => createHmac('sha256', config.encryptionKey).update(String(value)).digest('hex');
export async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < 10 || password.length > 128) fail(400, 'Usa una password da 10 a 128 caratteri.');
  const salt = randomBytes(16).toString('hex');
  return salt + ':' + Buffer.from(await derive(password, salt, 64)).toString('hex');
}
export async function checkPassword(password, hash) {
  if (!hash || typeof password !== 'string' || password.length > 128) return false;
  const [salt, stored] = hash.split(':');
  const value = Buffer.from(await derive(password, salt, 64));
  const expected = Buffer.from(stored, 'hex');
  return expected.length === value.length && timingSafeEqual(value, expected);
}
export function encrypt(config, value) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', config.encryptionKey, iv);
  const bytes = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), bytes].map(b => b.toString('base64')).join('.');
}
export function decrypt(config, value) {
  const [iv, tag, bytes] = value.split('.').map(v => Buffer.from(v, 'base64'));
  const cipher = createDecipheriv('aes-256-gcm', config.encryptionKey, iv);
  cipher.setAuthTag(tag);
  return JSON.parse(Buffer.concat([cipher.update(bytes), cipher.final()]).toString('utf8'));
}
export const postRecord = row => row && ({ ...JSON.parse(row.data), id: row.id, created_by_id: row.user_id, created_date: row.created_at, updated_date: row.updated_at });
