/// <reference types="vite/client" />
import { Capacitor, CapacitorHttp } from '@capacitor/core';
import { SecureStorage, KeychainAccess } from '@aparajita/capacitor-secure-storage';
import { Clipboard } from '@capacitor/clipboard';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { FileTransfer } from '@capacitor/file-transfer';
import { Share } from '@capacitor/share';
import { mobileOrigin, privateFilePath } from '../../shared/mobile-config.mjs';

export const isNative = Capacitor.isNativePlatform();
const configuredOrigin = import.meta.env.VITE_MOBILE_API_ORIGIN || '';
const localTest = import.meta.env.VITE_MOBILE_LOCAL_TEST === 'true';
export const apiOrigin = isNative ? mobileOrigin(configuredOrigin, localTest) : window.location.origin;
const tokenKey = 'clicksocial.session.' + apiOrigin;
let tokenPromise;

async function token() {
  if (!isNative) return '';
  tokenPromise ||= SecureStorage.get(tokenKey, false, false).then(value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value) ? value : '');
  return tokenPromise;
}
export async function rememberSession(value) {
  if (!isNative) return;
  if (!/^[a-f0-9]{64}$/.test(value)) throw new Error('Il server non ha restituito una sessione mobile valida.');
  await SecureStorage.set(tokenKey, value, false, false, KeychainAccess.whenUnlockedThisDeviceOnly);
  tokenPromise = Promise.resolve(value);
}
export async function forgetSession() {
  if (!isNative) return;
  await SecureStorage.remove(tokenKey, false);
  tokenPromise = Promise.resolve('');
}
export async function nativeHeaders(extra = {}) {
  const value = await token();
  return { ...extra, 'X-ClickSocial-Client': 'native', ...(value ? { Authorization: 'Bearer ' + value } : {}) };
}
export function apiUrl(path) {
  if (!path.startsWith('/api/') || path.includes('\\')) throw new Error('Percorso API non valido.');
  const url = new URL(path, apiOrigin);
  if (url.origin !== apiOrigin) throw new Error('Il collegamento non appartiene al server dell’app.');
  return url.href;
}
export function responseError(status, data = {}) {
  return Object.assign(new Error(data.error || 'Richiesta non riuscita.'), { status, code: data.code, data, response: { status, data } });
}
export async function nativeJson(path, options = {}) {
  const result = await CapacitorHttp.request({
    url: apiUrl('/api' + path), method: options.method || 'GET', headers: await nativeHeaders(options.headers),
    ...(options.body !== undefined ? { data: JSON.parse(options.body) } : {}),
    responseType: 'json', connectTimeout: 15000, readTimeout: 180000, disableRedirects: true,
  }).catch(() => { throw new Error('Non riesco a raggiungere ClickSocial. Verifica che il PC sia acceso, che il collegamento mobile sia avviato e che il telefono usi lo stesso Wi-Fi.'); });
  if (result.status < 200 || result.status >= 300) throw responseError(result.status, result.data);
  return result.data;
}

const mimeExtensions = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
const fileToBase64 = file => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result).split(',')[1]);
  reader.onerror = () => reject(new Error('Non riesco a leggere il file.'));
  reader.readAsDataURL(file);
});

export async function nativeUpload(file, kind = 'image') {
  const font = kind === 'font';
  const extension = font ? file.name.toLowerCase().match(/\.(woff2?|ttf|otf)$/)?.[1] : mimeExtensions[file.type];
  if (!extension || !file.size || file.size > (font ? 5 : 15) * 1024 * 1024) throw new Error(font ? 'Usa un font WOFF2, WOFF, TTF o OTF fino a 5 MB.' : 'Usa un’immagine JPEG, PNG, WebP o GIF fino a 15 MB.');
  const contentType = font ? { woff2:'font/woff2', woff:'font/woff', ttf:'font/ttf', otf:'font/otf' }[extension] : file.type;
  const path = 'clicksocial-upload-' + crypto.randomUUID() + '.' + extension;
  const saved = await Filesystem.writeFile({ path, directory: Directory.Cache, data: await fileToBase64(file) });
  try {
    const result = await FileTransfer.uploadFile({ url: apiUrl(font ? '/api/fonts' : '/api/files'), path: saved.uri,
      headers: await nativeHeaders({ 'Content-Type': contentType, 'X-File-Name': encodeURIComponent(file.name || 'immagine') }),
      readTimeout: 120000, connectTimeout: 15000, chunkedMode: false, disableRedirects: true,
    });
    const data = typeof result.response === 'string' ? JSON.parse(result.response) : result.response;
    if (!data?.file_url) throw new Error('Il server non ha confermato il caricamento.');
    return data;
  } catch (error) {
    const status = error.data?.httpStatus;
    if (status) {
      let data = {};
      try { data = JSON.parse(error.data.body); } catch { /* Il codice HTTP resta disponibile. */ }
      throw responseError(status, data);
    }
    throw error;
  } finally { await Filesystem.deleteFile({ path, directory: Directory.Cache }).catch(() => {}); }
}

async function acquirePrivateAsset(value, font = false) {
  const path = privateFilePath(value, apiOrigin);
  if (!isNative || !path) return { url: value, release() {} };
  const result = await CapacitorHttp.request({ url: apiUrl(path), method: 'GET', headers: await nativeHeaders(), responseType: 'arraybuffer', connectTimeout: 15000, readTimeout: 60000, disableRedirects: true });
  if (result.status !== 200) throw responseError(result.status);
  const mime = Object.entries(result.headers).find(([key]) => key.toLowerCase() === 'content-type')?.[1]?.split(';')[0];
  if (!(font ? ['font/woff2','font/woff','font/ttf','font/otf'].includes(mime) : !!mimeExtensions[mime]) || typeof result.data !== 'string' || result.data.length > 21 * 1024 * 1024) throw new Error('Il server ha restituito un file non valido.');
  const binary = atob(result.data);
  const bytes = Uint8Array.from(binary, character => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: mime }));
  return { url, release: () => URL.revokeObjectURL(url) };
}
export const acquireImage = value => acquirePrivateAsset(value);
export const acquireFont = value => acquirePrivateAsset(value, true);

export async function copyText(text) {
  if (isNative) await Clipboard.write({ string: text });
  else await navigator.clipboard.writeText(text);
}
export async function openExternal(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Collegamento non valido.');
  if (isNative) await Browser.open({ url: url.href });
  else window.location.assign(url.href);
}
export async function downloadPost(id) {
  if (!/^[a-f0-9-]{36}$/.test(id)) throw new Error('Post non valido.');
  const path = '/api/posts/' + id + '/download';
  if (!isNative) {
    const link = document.createElement('a'); link.href = path; link.download = ''; link.click(); return;
  }
  const filename = 'clicksocial-' + id + '.zip';
  const file = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
  await FileTransfer.downloadFile({ url: apiUrl(path), path: file.uri, headers: await nativeHeaders(), connectTimeout: 15000, readTimeout: 120000, disableRedirects: true });
  await Share.share({ title: 'Foto e testo del post', files: [file.uri], dialogTitle: 'Salva o condividi il post' });
}
