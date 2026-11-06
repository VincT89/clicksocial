export const PUBLISH_CHANNELS = ['instagram', 'facebook'];

export function validChannels(value) {
  return Array.isArray(value) && value.length <= PUBLISH_CHANNELS.length && value.every(id => PUBLISH_CHANNELS.includes(id)) && new Set(value).size === value.length;
}

export function postChannels(post) {
  if (validChannels(post.publish_channels)) return post.publish_channels;
  const id = String(post.platform).toLowerCase();
  return PUBLISH_CHANNELS.includes(id) ? [id] : [];
}
