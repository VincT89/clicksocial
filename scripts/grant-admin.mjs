import { loadConfig } from '../server/config.mjs';
import { openDatabase } from '../server/database.mjs';
import { grantAdmin } from '../server/admin-access.mjs';

let db;
try {
  const [email, ...flags] = process.argv.slice(2);
  if (!email || flags.length > 1 || flags.some(flag => flag !== '--apply')) throw new Error('Usa npm run admin:grant -- email; aggiungi --apply solo dopo aver verificato il destinatario.');
  /** Non inizializza tabelle: questa operazione richiede un'installazione già preparata. */
  db = await openDatabase(loadConfig(), { initialize: false });
  const result = await grantAdmin(db, email, flags.includes('--apply'));
  console.log(JSON.stringify(result));
  if (!result.applied) console.log('Nessun ruolo modificato. Verifica l’indirizzo e ripeti con --apply per confermare.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally { if (db) await db.close(); }
