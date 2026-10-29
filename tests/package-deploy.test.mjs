import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { mkdirSync, writeFileSync, symlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { collectReleaseFiles, excludedReleasePath, releaseRoots } from '../scripts/release-files.mjs';

function fixture() {
  const root = resolve('work/tests', 'package-' + randomUUID());
  const write = (name, content = 'fixture') => { mkdirSync(dirname(join(root, name)), { recursive: true }); writeFileSync(join(root, name), content); };
  for (const name of releaseRoots) {
    if (['server', 'shared', 'src', 'public', 'dist', 'scripts', 'tests'].includes(name)) mkdirSync(join(root, name), { recursive: true });
    else write(name);
  }
  write('dist/index.html', '<!doctype html><title>Fixture</title>');
  return { root, write };
}

test('rilascio: esclude istruzioni, chiavi e backup anche nelle cartelle pubbliche', () => {
  const { root, write } = fixture();
  const reserved = ['AGENTS.md', 'src/AGENTS.override.md', 'server/claude.local.md', 'public/SKILL.md',
    'src/.cursor/rules/review.mdc', 'public/example.prompt.md', 'scripts/.github/prompts/review.md', 'src/.mcp.json'];
  for (const name of reserved) assert.equal(excludedReleasePath(name), true, name);
  const forbidden = ['dist/.env', 'src/.env.example', 'public/backup/config.json', 'public/database.sql', 'dist/site.zip',
    'server/secret.pem', 'scripts/signing.pfx', 'src/.encryption-key', 'public/database.sqlite-wal',
    'server/config.mjs.bak', 'dist/backups/config.json'];
  for (const name of forbidden) write(name, 'excluded-fixture');
  const files = collectReleaseFiles(root);
  for (const name of forbidden) assert.ok(!files.some(file => file.name === name), name);
  assert.ok(!files.some(file => file.bytes.includes('excluded-fixture')));
});

test('rilascio: conserva modelli pubblici, codice condiviso e prompt applicativi', () => {
  const { root, write } = fixture();
  const required = ['server/app.mjs', 'shared/templates.mjs', 'src/lib/logoPlacement.js', 'server/prompts.mjs',
    'public/fonts/font.woff2', 'dist/assets/index.js', 'scripts/release-files.mjs'];
  for (const name of required) write(name);
  const names = collectReleaseFiles(root).map(file => file.name);
  for (const name of [...required, '.env.example', '.env.production.example', 'dist/index.html']) assert.ok(names.includes(name), name);
});

test('rilascio: riconosce nomi riservati anche su Windows e con maiuscole', () => {
  for (const name of ['src\\AGENTS.md', 'dist\\.ENV.PRODUCTION', 'public/KEY.P12', 'server/DATA/db.json']) assert.equal(excludedReleasePath(name), true, name);
});

test('rilascio: rifiuta collegamenti a directory esterne', t => {
  const { root } = fixture();
  const external = resolve('work/tests', 'outside-package-' + randomUUID());
  mkdirSync(external, { recursive: true });
  writeFileSync(join(external, 'private.txt'), 'external-fixture');
  try { symlinkSync(external, join(root, 'public', 'external'), process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (process.platform !== 'win32' || !['EPERM', 'EACCES'].includes(error.code)) throw error;
    t.skip('Windows non consente di creare collegamenti in questo ambiente di collaudo.');
    return;
  }
  assert.throws(() => collectReleaseFiles(root), /collegamenti simbolici/);
});
