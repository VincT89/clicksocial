export const NATIVE_ORIGINS = ['capacitor://localhost', 'https://localhost', 'http://localhost'];

export function isPrivateAddress(value) {
  const address = String(value || '').replace(/^::ffff:/, '');
  if (address === '::1' || address === 'localhost') return true;
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(address)) return false;
  const parts = address.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  return parts[0] === 10 || parts[0] === 127 || (parts[0] === 192 && parts[1] === 168) || (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31);
}

export function mobileOrigin(value, localTest = false) {
  let url;
  try { url = new URL(String(value || '')); } catch { throw new Error('Indica un indirizzo completo del backend, compresi protocollo e porta.'); }
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) throw new Error('L’indirizzo del backend deve contenere solo protocollo, host e porta.');
  if (url.protocol !== 'https:' && !(localTest && url.protocol === 'http:' && isPrivateAddress(url.hostname))) throw new Error('Serve HTTPS; HTTP è consentito soltanto per il collaudo esplicito su una rete locale.');
  return url.origin;
}

export function privateFilePath(value, origin) {
  let url;
  try { url = new URL(value, origin); } catch { return null; }
  return url.origin === new URL(origin).origin && /^\/api\/files\/[a-f0-9-]{36}$/.test(url.pathname) && !url.search && !url.hash ? url.pathname : null;
}
