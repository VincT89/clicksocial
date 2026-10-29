import { lstatSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const releaseRoots = ['app.cjs', 'package.json', 'package-lock.json', '.npmrc', '.env.example', '.env.production.example',
  'index.html', 'vite.config.js', 'postcss.config.js', 'tailwind.config.js', 'eslint.config.js', 'jsconfig.json',
  'README.md', 'PLESK.md', 'MYSQL.md', 'GUIDA.md', 'SOCIAL.md', 'MOBILE.md', 'IOS-CODEMAGIC.md',
  'server', 'shared', 'src', 'public', 'dist', 'scripts', 'tests'];

const privateEntry = /^(?:(?:AGENTS|CLAUDE|GEMINI|SKILL)(?:\.[^.]+)*\.md|.*\.prompt\.md|\.(?:agents|codex|claude|cursor|windsurf|roo|git|ssh|aws)|\.(?:clinerules|cursorrules|windsurfrules|mcp\.json)|node_modules|data|work|backups?|exports|dumps|outputs|coverage|test-results|playwright-report|\.encryption-key)$/i;
const privateExtension = /\.(?:pem|key|p8|p12|pfx|jks|keystore|mobileprovision|provisionprofile|bak|backup|old|orig|dump|sql(?:\.gz)?|sqlite3?(?:-(?:wal|shm))?|db(?:-(?:wal|shm))?|zip|7z|rar|tgz|tar(?:\.(?:gz|xz))?)$/i;

export function excludedReleasePath(name) {
  const normalized = name.replaceAll('\\', '/');
  if (['.env.example', '.env.production.example'].includes(normalized)) return false;
  const parts = normalized.split('/');
  return parts.some(part => privateEntry.test(part) || /^\.env(?:\.|$)/i.test(part) || privateExtension.test(part))
    || /(?:^|\/)\.github\/(?:copilot-instructions\.md|instructions(?:\/|$)|prompts(?:\/|$)|agents(?:\/|$))/i.test(normalized);
}

export function collectReleaseFiles(root) {
  const files = [];
  function include(path) {
    const name = relative(root, path).replaceAll('\\', '/');
    if (excludedReleasePath(name)) return;
    const info = lstatSync(path);
    /** I collegamenti potrebbero includere dati esterni anche dentro una cartella ammessa. */
    if (info.isSymbolicLink()) throw new Error('Il pacchetto non accetta collegamenti simbolici: ' + name);
    if (info.isDirectory()) for (const item of readdirSync(path).sort()) include(join(path, item));
    else if (info.isFile()) files.push({ name, bytes: readFileSync(path) });
  }
  /** Le esclusioni vengono applicate anche ai file annidati nelle cartelle del rilascio. */
  for (const entry of releaseRoots) include(join(root, entry));
  return files;
}
