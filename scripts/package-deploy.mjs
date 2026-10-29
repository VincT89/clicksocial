import { existsSync, mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { zipFiles } from '../server/zip.mjs';
import { collectReleaseFiles } from './release-files.mjs';

const root = resolve(import.meta.dirname, '..');
try {
  if (!existsSync(join(root, 'dist/index.html'))) throw new Error('Compila prima l’interfaccia con npm run build.');
  const files = collectReleaseFiles(root);
  const manifest = files.map(file => createHash('sha256').update(file.bytes).digest('hex') + '  ' + file.name).join('\n') + '\n';
  files.push({ name: 'SHA256SUMS.txt', bytes: Buffer.from(manifest) });
  const output = join(root, 'work/deploy');
  mkdirSync(output, { recursive: true });
  const directory = mkdtempSync(join(output, 'release-'));
  const archive = join(directory, 'ClickSocial-Plesk.zip');
  writeFileSync(archive, zipFiles(files), { flag: 'wx' });
  console.log('Pacchetto web: ' + archive);
  console.log('Contiene codice e interfaccia compilata. Database, file degli utenti e credenziali devono essere trasferiti separatamente.');
} catch (error) { console.error('Pacchetto non creato:', error.message); process.exitCode = 1; }
