import { isIP } from 'node:net';
import { fail } from './store.mjs';

function normalizeAddress(value) {
  if (typeof value !== 'string' || value.includes('%') || !isIP(value)) return null;
  if (isIP(value) === 4) return value;
  const normalized = new URL('http://[' + value + ']').hostname.slice(1, -1);
  const mapped = /^::ffff:([a-f0-9]{1,4}):([a-f0-9]{1,4})$/.exec(normalized);
  if (!mapped) return normalized;
  const high = parseInt(mapped[1], 16), low = parseInt(mapped[2], 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

export function createClientAddressResolver(mode = 'none', passenger = globalThis.PhusionPassenger) {
  if (!['none', 'passenger'].includes(mode)) throw new Error('PROXY_MODE deve essere none oppure passenger.');
  if (mode === 'passenger' && typeof passenger?.configure !== 'function') {
    throw new Error('PROXY_MODE=passenger richiede l’avvio tramite Passenger di Plesk.');
  }
  return req => {
    if (mode === 'none') return normalizeAddress(req.socket.remoteAddress) || 'unknown';
    /** Passenger rifiuta gli header !~ inviati dal client; X-Forwarded-For non offre questa garanzia. */
    const address = normalizeAddress(req.headers['!~passenger-client-address']);
    if (!address) fail(503, 'Il proxy non comunica l’indirizzo del visitatore. Contatta il gestore del servizio.', 'proxy_unconfigured');
    return address;
  };
}
