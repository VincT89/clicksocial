import { MEDIA_IMAGE_TYPES } from '../shared/media.mjs';
import { fail } from './store.mjs';

const PAGE_SIZE = 24;

export async function listMedia(db, config, user, params) {
  const kind = params.get('kind') || 'all';
  if (!['all', 'photo', 'graphic'].includes(kind)) fail(400, 'Tipo di media non valido.');
  const cursor = params.get('cursor');
  const position = cursor && /^([0-9T:.Z+-]{10,32})~([a-f0-9-]{36})$/i.exec(cursor);
  if (cursor && (!position || !Number.isFinite(Date.parse(position[1])))) fail(400, 'Pagina della libreria non valida.');

  const original = db.json('original_image_url');
  const rendered = `COALESCE(NULLIF(NULLIF(${db.json('image_url')}, ''), 'null'), ${db.json('graphic_url')})`;
  /** Per i vecchi post usiamo solo i riferimenti salvati dall’account. Un file privato generico potrebbe essere un logo o un’esportazione temporanea. */
  const sources = `
    SELECT m.file_id, 0 AS priority FROM media_uploads m JOIN files owned ON owned.id=m.file_id WHERE owned.user_id=?
    UNION ALL
    SELECT SUBSTR(p.file_url,-36) AS file_id, p.priority FROM (
      SELECT ${original} AS file_url, 0 AS priority FROM posts WHERE user_id=?
      UNION ALL
      SELECT ${rendered} AS file_url, 1 AS priority FROM posts WHERE user_id=?
    ) p WHERE SUBSTR(p.file_url,1,LENGTH(p.file_url)-36) IN ('/api/files/', ?)`;
  const from = `FROM files f JOIN (
    SELECT file_id, MIN(priority) AS priority FROM (${sources}) candidates GROUP BY file_id
  ) media ON media.file_id=f.id WHERE f.user_id=? AND f.mime IN (?,?,?,?)` + (kind === 'all' ? '' : ' AND media.priority=?');
  const bindings = [user.id, user.id, user.id, new URL(config.origin).origin + '/api/files/', user.id, ...MEDIA_IMAGE_TYPES];
  if (kind !== 'all') bindings.push(kind === 'photo' ? 0 : 1);
  const count = await db.prepare('SELECT COUNT(*) AS total ' + from).get(...bindings);
  const pageCondition = position ? ' AND (f.created_at < ? OR (f.created_at = ? AND f.id < ?))' : '';
  const pageBindings = position ? [...bindings, position[1], position[1], position[2]] : bindings;
  const rows = await db.prepare(`SELECT f.id, f.name, f.mime, f.created_at, media.priority ${from}${pageCondition}
    ORDER BY f.created_at DESC, f.id DESC LIMIT ${PAGE_SIZE + 1}`).all(...pageBindings);
  const items = rows.slice(0, PAGE_SIZE).map(({ id, name, mime, created_at, priority }) => ({
    id, name, mime, created_at, kind:Number(priority) === 0 ? 'photo' : 'graphic', file_url:'/api/files/' + id,
  }));
  const last = items.at(-1);
  return { items, total:Number(count.total), nextCursor:rows.length > PAGE_SIZE ? last.created_at + '~' + last.id : null };
}
