import { loadConfig } from '../server/config.mjs';
import { openDatabase } from '../server/database.mjs';
import { createIntegrations } from '../server/integrations.mjs';

let db, integrations;
try {
  const config = loadConfig();
  if (config.localMode) throw new Error('Il comando pianificato richiede LOCAL_MODE=false e il dominio HTTPS configurato.');
  db = await openDatabase(config, { initialize: false });
  integrations = createIntegrations(db, config);
  /** Usa la stessa coda e gli stessi blocchi dell'app, anche se Passenger non è in esecuzione. */
  await integrations.publishDuePosts();
  console.log('Controllo della coda completato. Verifica gli esiti dei singoli invii nella Libreria.');
} catch (error) { console.error('Controllo della coda non riuscito:', error.message); process.exitCode = 1; }
finally {
  try { await integrations?.publication.waitForIdle(); }
  finally { if (db) await db.close(); }
}
