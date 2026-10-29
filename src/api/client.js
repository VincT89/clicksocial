import { isNative, nativeJson, nativeUpload, rememberSession, forgetSession } from '@/lib/mobile';

async function request(path, options = {}) {
  if (isNative) {
    const data = await nativeJson(path, options);
    if (data?.session_token) {
      await rememberSession(data.session_token);
      delete data.session_token;
    }
    return data;
  }
  const response = await fetch('/api' + path, { credentials: 'same-origin', ...options });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || 'Richiesta non riuscita.'), { status: response.status, code: data.code, data, response: { status: response.status, data } });
  return data;
}
/** @param {string} path @param {any} data @param {string} [method] */
const send = (path, data = {}, method = 'POST') => request(path, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
const entity = name => ({
  list: (sort = '-created_date', limit = 10000) => request('/entities/' + name + '?sort=' + encodeURIComponent(sort) + '&limit=' + limit),
  get: id => request('/entities/' + name + '/' + encodeURIComponent(id)),
  create: data => send('/entities/' + name, data),
  update: (id, data) => send('/entities/' + name + '/' + encodeURIComponent(id), data, 'PATCH'),
  delete: id => send('/entities/' + name + '/' + encodeURIComponent(id), {}, 'DELETE'),
});
export const api = {
  app: { getPublicSettings: () => request('/settings') },
  auth: {
    me: () => request('/auth/me'),
    register: data => send('/auth/register', data),
    verifyOtp: data => send('/auth/verify', data),
    resendOtp: email => send('/auth/resend', { email }),
    loginViaEmailPassword: (email, password) => send('/auth/login', { email, password }),
    updateMe: data => send('/auth/me', data, 'PATCH'),
    resetPasswordRequest: email => send('/auth/reset-request', { email }),
    resetPassword: data => send('/auth/reset', data),
    logout: async (/** @type {string|false} */ returnTo = '/') => { await send('/auth/logout'); await forgetSession(); if (returnTo !== false) window.location.assign(returnTo); },
    redirectToLogin: (returnTo = '/') => window.location.assign('/login?returnTo=' + encodeURIComponent(returnTo)),
    loginWithProvider: async (provider, returnTo = '/') => { if (isNative) throw new Error('Per questo collaudo mobile accedi con email e password. Il collegamento Google resta disponibile dalla versione web.'); const result = await send('/oauth/' + provider + '/start', { returnTo }); window.location.assign(result.url); },
  },
  entities: { Post: entity('Post'), User: entity('User'), AiLog: entity('AiLog') },
  functions: { invoke: async (name, data = {}) => ({ data: await send('/functions/' + name, data) }) },
  integrations: { Core: { UploadFile: async ({ file }) => isNative ? nativeUpload(file) : request('/files', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name || 'immagine') }, body: file }) } },
  brand: { uploadFont: file => isNative ? nativeUpload(file, 'font') : request('/fonts', { method: 'POST', headers: { 'Content-Type': file.type || 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }, body: file }) },
  social: {
    status: () => request('/social/status'),
    connect: provider => send('/social/' + encodeURIComponent(provider) + '/connect'),
    disconnect: provider => send('/social/' + encodeURIComponent(provider) + '/disconnect'),
    flow: id => request('/social/flows/' + encodeURIComponent(id)),
    confirm: (id, account_ids) => send('/social/flows/' + encodeURIComponent(id) + '/confirm', { account_ids }),
    cancel: id => send('/social/flows/' + encodeURIComponent(id) + '/cancel'),
    prepare: id => request('/social/posts/' + encodeURIComponent(id) + '/prepare'),
    publish: data => send('/social/publish', data),
    resolve: (id, outcome) => send('/social/posts/' + encodeURIComponent(id) + '/resolve', { checked: true, outcome }),
  },
  editorial: {
    plan: (id, data) => send('/posts/' + encodeURIComponent(id) + '/plan', data, 'PATCH'),
    cancelSchedule: id => send('/posts/' + encodeURIComponent(id) + '/cancel-schedule'),
    markPublished: id => send('/posts/' + encodeURIComponent(id) + '/mark-published'),
  },
  admin: { summary: () => request('/admin/summary'), aiPricing: () => request('/admin/ai-pricing') },
};
