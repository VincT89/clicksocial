export function socialReturnPath(value) {
  try {
    const url = new URL(value);
    const id = url.searchParams.get('flow');
    if (url.protocol !== 'it.sodanoconsulting.clicksocial:' || url.hostname !== 'social-return' || url.username || url.password || url.port || !['', '/'].includes(url.pathname) || !/^[a-f0-9]{64}$/.test(id || '')) return null;
    return '/profilo?section=social&social_flow=' + id;
  } catch { return null; }
}
