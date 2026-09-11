import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const path = require.resolve('@ionic/utils-terminal/dist/info.js');
const source = readFileSync(path, 'utf8');
const before = '    const { shell } = os.userInfo();';
const after = '    let shell;\n    try { ({ shell } = os.userInfo()); } catch { /* Optional shell metadata can be unavailable in a restricted Windows environment. */ }';
// La libreria continua con i propri fallback SHELL/COMSPEC; non servono dati dell’account.
if (source.includes(before)) writeFileSync(path, source.replace(before, after));
else if (!source.includes(after)) throw new Error('La libreria del terminale è cambiata: verificare il piccolo adattamento prima di proseguire.');
