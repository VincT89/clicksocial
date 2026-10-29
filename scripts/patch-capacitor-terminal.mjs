import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let path;
/** Il server non installa Capacitor CLI con --omit=dev; la correzione serve solo agli strumenti Windows. */
if (process.platform === 'win32') {
  try { path = require.resolve('@ionic/utils-terminal/dist/info.js'); }
  catch (error) { if (error.code !== 'MODULE_NOT_FOUND') throw error; }
}
const before = '    const { shell } = os.userInfo();';
const after = '    let shell;\n    try { ({ shell } = os.userInfo()); } catch { /* Optional shell metadata can be unavailable in a restricted Windows environment. */ }';
if (path) {
  const source = readFileSync(path, 'utf8');
  /** La libreria conserva i fallback SHELL/COMSPEC quando i metadati dell'account non sono accessibili. */
  if (source.includes(before)) writeFileSync(path, source.replace(before, after));
  else if (!source.includes(after)) throw new Error('La libreria del terminale è cambiata: verificare il piccolo adattamento prima di proseguire.');
}
