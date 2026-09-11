import { NATIVE_ORIGINS, isPrivateAddress } from '../shared/mobile-config.mjs';
import { fail } from './store.mjs';

export function sessionToken(req) {
  if (req.headers.authorization !== undefined) {
    return /^Bearer ([a-f0-9]{64})$/.exec(req.headers.authorization)?.[1] || '';
  }
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('clicksocial_session='))?.slice('clicksocial_session='.length) || '';
}

export const isNativeRequest = req => req.headers['x-clicksocial-client'] === 'native';
export const isLoopback = address => ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(address);

export function mobileRequestPolicy(req, res, config, pathname) {
  if (config.lanMode && !isPrivateAddress(req.socket.remoteAddress)) fail(403, 'Il collaudo è disponibile soltanto sulla rete locale.');
  if (pathname === '/dev/mail' && !isLoopback(req.socket.remoteAddress)) fail(403, 'La posta di collaudo è consultabile soltanto sul PC del server.');
  const origin = req.headers.origin;
  const allowed = origin === config.origin || (NATIVE_ORIGINS.includes(origin) && isNativeRequest(req));
  // Le richieste preliminari non contengono ancora il valore dell’header client.
  const preflight = req.method === 'OPTIONS' && pathname.startsWith('/api/');
  if (origin && (allowed || (preflight && NATIVE_ORIGINS.includes(origin)))) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  }
  if (preflight) {
    if (!origin || !(origin === config.origin || NATIVE_ORIGINS.includes(origin))) fail(403, 'Origine non autorizzata.');
    const headers = String(req.headers['access-control-request-headers'] || '').toLowerCase().split(',').map(h => h.trim()).filter(Boolean);
    if (headers.some(h => !['content-type', 'x-file-name', 'authorization', 'x-clicksocial-client'].includes(h))) fail(403, 'Header non autorizzato.');
    if (!['GET', 'POST', 'PATCH', 'DELETE'].includes(req.headers['access-control-request-method'])) fail(405, 'Metodo non consentito.');
    res.writeHead(204, { 'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE', 'Access-Control-Allow-Headers': 'Content-Type, X-File-Name, Authorization, X-ClickSocial-Client', 'Access-Control-Max-Age': '600' });
    res.end();
    return true;
  }
  if (origin && !allowed && !['GET', 'HEAD'].includes(req.method) && pathname !== '/api/stripe/webhook') fail(403, 'Origine non autorizzata.');
  // Una risposta con un token non deve poter essere ottenuta da origini web arbitrarie.
  if (isNativeRequest(req) && origin && !allowed) fail(403, 'Origine non autorizzata.');
  return false;
}
