import { loadConfig } from '../server/config.mjs';
import { openDatabase, initializeMySQL } from '../server/database.mjs';
import { sqliteSnapshot, assertEmptyMySQL, migrateSnapshot } from '../server/mysql-migration.mjs';

const [mode, ...flags] = process.argv.slice(2);
let db;
try {
  if (!['check','init','migrate'].includes(mode) || flags.some(flag => flag !== '--apply') || (mode !== 'migrate' && flags.length)) {
    throw new Error('Usa db:check:mysql, db:init:mysql oppure db:migrate:mysql. Aggiungi -- --apply soltanto per eseguire il trasferimento.');
  }
  const config = loadConfig({ dbDriver: 'mysql' });
  if (mode === 'migrate' && flags.includes('--apply')) {
    let running = false;
    try {
      const response = await fetch(config.origin + '/api/health', { signal: AbortSignal.timeout(1500), redirect: 'manual' });
      running = response.ok;
    } catch { /* Il backend deve essere spento durante il trasferimento. */ }
    if (running) throw new Error('Ferma prima ClickSocial nel terminale. Poi ripeti la migrazione: i dati di origine devono restare fermi fino al passaggio a MySQL.');
  }
  const snapshot = mode === 'migrate' ? sqliteSnapshot(config) : null;
  if (snapshot) console.log('Dati SQLite da trasferire: ' + JSON.stringify(snapshot.counts));
  db = await openDatabase(config, { initialize: false });
  const info = await db.prepare('SELECT VERSION() AS version, DATABASE() AS name').get();
  console.log('Connessione riuscita al database ' + info.name + ' (' + info.version + ').');
  if (mode === 'init') {
    await initializeMySQL(db, config);
    console.log('Tabelle ClickSocial pronte. Per usare MySQL imposta DB_DRIVER=mysql nel file .env e riavvia l’app.');
  }
  if (mode === 'migrate') {
    await assertEmptyMySQL(db, config);
    if (!flags.includes('--apply')) console.log('Destinazione vuota e dati verificati. Nessuna modifica eseguita. Ferma l’app e usa npm run db:migrate:mysql -- --apply per trasferirli.');
    else {
      const counts = await migrateSnapshot(db, config, snapshot);
      console.log('Trasferimento completato e verificato: ' + JSON.stringify(counts));
      console.log('Imposta DB_DRIVER=mysql e avvia l’app. Conserva data/uploads e data/.encryption-key: foto e collegamenti li richiedono. Il database SQLite originale è stato conservato.');
    }
  }
} catch (error) { console.error('Operazione MySQL non completata: ' + error.message); process.exitCode = 1; }
finally { if (db) await db.close(); }
