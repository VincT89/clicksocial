import { editorialDate, scheduledTime } from './editorialDates.mjs';

function lastEditedTime(post) {
  const updated = Date.parse(post.updated_date);
  if (Number.isFinite(updated)) return updated;
  const created = Date.parse(post.created_date);
  return Number.isFinite(created) ? created : -Infinity;
}

export function homePostLists(posts) {
  const { scheduled, recent, attention } = overview(posts);
  const programmed = scheduled.filter(post => Number.isFinite(scheduledTime(post))).slice(0, 3);
  const displayed = new Set(programmed.map(post => post.id));
  return { programmed, recent: recent.filter(post => !displayed.has(post.id)).slice(0, 3), attention };
}

export function overview(posts, now = new Date()) {
  const scheduled = posts.filter(post => post.status === 'in_coda').sort((a,b) => scheduledTime(a) - scheduledTime(b));
  const drafts = posts.filter(post => ['bozza','pronto'].includes(post.status));
  const attention = posts.filter(post => ['fallito','da_verificare'].includes(post.status));
  const published = posts.filter(post => post.status === 'pubblicato');
  const upcoming = posts.filter(post => !['pubblicato','fallito','da_verificare'].includes(post.status) && editorialDate(post) && new Date(editorialDate(post)) >= now).sort((a,b) => new Date(editorialDate(a)).getTime() - new Date(editorialDate(b)).getTime());
  const recent = [...posts].sort((a,b) => lastEditedTime(b) - lastEditedTime(a));
  return { scheduled, drafts, attention, published, upcoming, recent };
}
export function publicationHistory(posts, days, now = new Date()) {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + 1);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return posts.filter(post => {
    const date = new Date(post.published_at);
    return post.status === 'pubblicato' && Number.isFinite(date.getTime()) && date >= start && date < end;
  });
}
