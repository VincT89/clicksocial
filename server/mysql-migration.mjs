import { DatabaseSync } from 'node:sqlite';
import { existsSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { TABLES, mysqlTables, initializeMySQL } from './database.mjs';

const COLUMNS = {
  users: ['id','email','password','verified','role','plan','ai_used','profile','stripe_customer_id','stripe_subscription_id','created_at'],
  sessions: ['hash','user_id','expires'], challenges: ['email','purpose','hash','expires','attempts'],
  posts: ['id','user_id','data','created_at','updated_at'], files: ['id','user_id','mime','name','size','created_at'],
  ai_logs: ['id','user_id','data','created_at'], social_connections: ['user_id','encrypted'],
  oauth_states: ['hash','provider','data','expires'], oauth_identities: ['provider','subject','user_id'],
  stripe_events: ['id','created_at'], mail: ['id','recipient','subject','body','created_at'],
};

export function sqliteSnapshot(config) {
  const file = join(config.dataDir, 'clicksocial.sqlite');
  if (!existsSync(file)) throw new Error('Il database SQLite di origine non esiste. Per iniziare senza dati usa db:init:mysql.');
  const db = new DatabaseSync(file, { readOnly: true, timeout: 5000 });
  try {
    db.exec('BEGIN');
    if (db.prepare('PRAGMA user_version').get().user_version !== 1) throw new Error('Versione SQLite non supportata dalla migrazione.');
    const rows = {}, counts = {};
    for (const table of TABLES) {
      const columns = db.prepare('PRAGMA table_info(' + table + ')').all().map(row => row.name);
      if (JSON.stringify(columns) !== JSON.stringify(COLUMNS[table])) throw new Error('Struttura della tabella SQLite non riconosciuta: ' + table);
      rows[table] = db.prepare('SELECT * FROM ' + table).all();
      counts[table] = rows[table].length;
    }
    for (const file of rows.files) {
      if (!/^[a-f0-9-]{36}$/.test(file.id)) throw new Error('Identificativo di un file non valido.');
      const path = join(config.dataDir, 'uploads', file.id);
      if (!existsSync(path) || !statSync(path).isFile() || statSync(path).size !== file.size) throw new Error('Una foto manca o ha una dimensione diversa: ripristina la cartella data/uploads prima della migrazione.');
    }
    db.exec('COMMIT');
    return { rows, counts, source: file };
  } finally { db.close(); }
}

export async function assertEmptyMySQL(db, config) {
  if (db.kind !== 'mysql') throw new Error('La destinazione deve essere MySQL.');
  const names = await mysqlTables(db);
  if (names.length && !names.includes('clicksocial_meta')) throw new Error('La destinazione contiene già tabelle estranee a ClickSocial. Usa un database dedicato e vuoto.');
  if (names.includes('clicksocial_meta')) {
    const meta = await db.prepare('SELECT * FROM clicksocial_meta WHERE id=1').get();
    if (meta && ![0,1].includes(meta.schema_version)) throw new Error('Versione della destinazione non supportata.');
    const hash = createHash('sha256').update(config.encryptionKey).digest('hex');
    if (meta && meta.key_hash !== hash) throw new Error('La destinazione usa una chiave di cifratura diversa.');
  }
  for (const table of TABLES) if (names.includes(table) && (await db.prepare('SELECT COUNT(*) AS count FROM ' + table).get()).count > 0) {
    throw new Error('Migrazione interrotta: la destinazione contiene già dati nella tabella ' + table + '. Nessun dato è stato sovrascritto.');
  }
}

const fingerprint = (table, rows) => {
  const values = rows.map(row => JSON.stringify(COLUMNS[table].map(column => row[column]))).sort();
  return createHash('sha256').update(JSON.stringify(values)).digest('hex');
};

export async function migrateSnapshot(db, config, snapshot) {
  await assertEmptyMySQL(db, config);
  await initializeMySQL(db, config);
  return db.transaction(async () => {
    await assertEmptyMySQL(db, config);
    for (const table of TABLES) {
      const columns = COLUMNS[table];
      const insert = db.prepare('INSERT INTO ' + table + ' (' + columns.join(',') + ') VALUES (' + columns.map(() => '?').join(',') + ')');
      for (const row of snapshot.rows[table]) await insert.run(...columns.map(column => row[column]));
    }
    for (const table of TABLES) {
      const rows = await db.prepare('SELECT * FROM ' + table).all();
      if (fingerprint(table, rows) !== fingerprint(table, snapshot.rows[table])) throw new Error('Verifica dei dati non riuscita: ' + table + '. Migrazione annullata.');
    }
    return snapshot.counts;
  });
}
