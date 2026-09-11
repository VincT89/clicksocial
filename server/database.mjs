import { AsyncLocalStorage } from 'node:async_hooks';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { SQLITE_SCHEMA, MYSQL_SCHEMA, TABLES } from './schema.mjs';

const keyHash = config => createHash('sha256').update(config.encryptionKey).digest('hex');
const choose = (query, kind) => {
  const sql = typeof query === 'string' ? query : query[kind];
  if (!sql) throw new Error('Query non disponibile per ' + kind + '.');
  return sql;
};

class Store {
  context = new AsyncLocalStorage();
  tail = Promise.resolve();
  constructor(kind, connection) { this.kind = kind; this.connection = connection; }
  prepare(query) {
    const sql = choose(query, this.kind);
    return {
      get: (...params) => this.execute(sql, params, 'get'),
      all: (...params) => this.execute(sql, params, 'all'),
      run: (...params) => this.execute(sql, params, 'run'),
    };
  }
  json(field, column = 'data') {
    if (![field, column].every(value => /^[A-Za-z_][A-Za-z_0-9]*$/.test(value))) throw new Error('Campo JSON non valido.');
    const expression = `json_extract(${column},'$.${field}')`;
    return this.kind === 'mysql' ? `json_unquote(${expression})` : expression;
  }
  current() {
    const state = this.context.getStore();
    if (state && !state.active) throw new Error('La transazione del database è già terminata.');
    return state;
  }
  serial(fn) {
    const operation = this.tail.then(fn);
    this.tail = operation.catch(() => {});
    return operation;
  }
  async execute(sql, params, mode) {
    const state = this.current();
    if (this.kind === 'sqlite') {
      const operation = () => this.connection.prepare(sql)[mode](...params);
      return state ? operation() : this.serial(operation);
    }
    const [result] = await (state?.connection || this.connection).execute(sql, params);
    if (mode === 'run') return { changes: result.affectedRows, lastInsertRowid: result.insertId };
    return mode === 'get' ? result[0] : result;
  }
  async transaction(fn) {
    if (this.current()) throw new Error('Le transazioni annidate non sono supportate.');
    if (this.kind === 'sqlite') return this.serial(async () => {
      const state = { active: true };
      this.connection.exec('BEGIN IMMEDIATE');
      try {
        const result = await this.context.run(state, fn);
        this.connection.exec('COMMIT');
        return result;
      } catch (error) { this.connection.exec('ROLLBACK'); throw error; }
      finally { state.active = false; }
    });
    const connection = await this.connection.getConnection();
    const state = { connection, active: true };
    try {
      await connection.beginTransaction();
      // Serializza le operazioni composte anche fra più processi del backend.
      await connection.query('SELECT id FROM clicksocial_meta WHERE id=1 FOR UPDATE');
      const result = await this.context.run(state, fn);
      await connection.commit();
      return result;
    } catch (error) { await connection.rollback(); throw error; }
    finally { state.active = false; connection.release(); }
  }
  async close() {
    if (this.current()) throw new Error('Chiudi il database dopo la transazione.');
    if (this.kind === 'sqlite') await this.serial(() => this.connection.close());
    else await this.connection.end();
  }
}

export async function mysqlTables(db) {
  const rows = await db.prepare('SHOW TABLES').all();
  return rows.map(row => Object.values(row)[0]);
}

export async function initializeMySQL(db, config) {
  const connection = await db.connection.getConnection();
  const lock = 'clicksocial:init:' + createHash('sha256').update(config.mysql.database).digest('hex').slice(0, 32);
  let locked = false;
  try {
    const [[result]] = await connection.execute('SELECT GET_LOCK(?,10) AS acquired', [lock]);
    if (result.acquired !== 1) throw new Error('Inizializzazione MySQL già in corso. Riprova fra qualche secondo.');
    locked = true;
    const [tables] = await connection.query('SHOW TABLES');
    const names = tables.map(row => Object.values(row)[0]);
    if (names.length && !names.includes('clicksocial_meta')) throw new Error('Il database MySQL contiene già tabelle estranee a ClickSocial. Usa un database dedicato e vuoto.');
    if (names.includes('clicksocial_meta')) {
      const [[meta]] = await connection.query('SELECT * FROM clicksocial_meta WHERE id=1');
      if (meta && ![0, 1].includes(meta.schema_version)) throw new Error('Versione del database MySQL non supportata da questa copia dell’app.');
      if (meta && meta.key_hash !== keyHash(config)) throw new Error('Questo database usa una chiave diversa. Ripristina data/.encryption-key dalla stessa installazione per conservarne sessioni e collegamenti.');
    }
    await connection.query(MYSQL_SCHEMA[0]);
    await connection.execute('INSERT IGNORE INTO clicksocial_meta (id,schema_version,key_hash) VALUES (1,0,?)', [keyHash(config)]);
    for (const sql of MYSQL_SCHEMA.slice(1)) await connection.query(sql);
    await connection.query('UPDATE clicksocial_meta SET schema_version=1 WHERE id=1');
  } finally {
    try { if (locked) await connection.execute('SELECT RELEASE_LOCK(?)', [lock]); }
    finally { connection.release(); }
  }
}

export async function openDatabase(config, { initialize = true } = {}) {
  if (config.dbDriver === 'sqlite') {
    const { DatabaseSync } = await import('node:sqlite');
    const connection = new DatabaseSync(join(config.dataDir, 'clicksocial.sqlite'), { timeout: 5000 });
    try {
      connection.exec('PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;');
      if (initialize) connection.exec(SQLITE_SCHEMA);
      return new Store('sqlite', connection);
    } catch (error) { connection.close(); throw error; }
  }
  if (config.dbDriver !== 'mysql') throw new Error('DB_DRIVER deve essere sqlite oppure mysql.');
  const { host, port, database, user, password, ssl, ca } = config.mysql;
  if (!host || !database || !user) throw new Error('Completa MYSQL_HOST, MYSQL_DATABASE e MYSQL_USER nel file .env.');
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('MYSQL_PORT deve essere una porta valida.');
  if (ca && !ssl) throw new Error('MYSQL_SSL_CA richiede MYSQL_SSL=true.');
  const mysql = (await import('mysql2/promise')).default;
  const pool = mysql.createPool({ host, port, database, user, password,
    charset: 'utf8mb4_bin', supportBigNumbers: true, bigNumberStrings: false,
    waitForConnections: true, connectionLimit: 5, queueLimit: 1000, connectTimeout: 10000,
    multipleStatements: false, enableKeepAlive: true,
    ...(ssl ? { ssl: { rejectUnauthorized: true, verifyIdentity: true, minVersion: 'TLSv1.2', ...(ca ? { ca: readFileSync(resolve(config.root, ca), 'utf8') } : {}) } } : {}),
  });
  const db = new Store('mysql', pool);
  try {
    await db.prepare('SELECT 1 AS ok').get();
    if (initialize) await initializeMySQL(db, config);
    return db;
  } catch (error) {
    await pool.end();
    const messages = {
      ECONNREFUSED: 'MySQL non risponde. Avvia il servizio e controlla MYSQL_HOST e MYSQL_PORT.',
      ETIMEDOUT: 'Connessione MySQL scaduta. Controlla host, porta e accesso al server.',
      ENOTFOUND: 'MYSQL_HOST non è raggiungibile.',
      ER_ACCESS_DENIED_ERROR: 'Accesso MySQL rifiutato. Controlla MYSQL_USER e MYSQL_PASSWORD nel file .env.',
      ER_BAD_DB_ERROR: 'Il database indicato in MYSQL_DATABASE non esiste. Crealo in phpMyAdmin.',
    };
    throw messages[error.code] ? new Error(messages[error.code], { cause: error }) : error;
  }
}

export { TABLES };
