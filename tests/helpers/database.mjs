import { randomUUID } from 'node:crypto';

export async function testDatabase() {
  if (!process.env.CLICKSOCIAL_TEST_MYSQL) return { dbDriver: 'sqlite' };
  const mysql = JSON.parse(process.env.CLICKSOCIAL_TEST_MYSQL);
  if (mysql.host !== '127.0.0.1' || !Number.isInteger(mysql.port) || mysql.port < 10000) throw new Error('I test SQL richiedono il server temporaneo su una porta dedicata.');
  const driver = (await import('mysql2/promise')).default;
  const connection = await driver.createConnection(mysql);
  const database = 'clicksocial_test_' + randomUUID().replaceAll('-', '');
  try { await connection.query('CREATE DATABASE `' + database + '` CHARACTER SET utf8mb4 COLLATE utf8mb4_bin'); }
  finally { await connection.end(); }
  return { dbDriver: 'mysql', mysql: { ...mysql, database, ssl: false, ca: '' } };
}

export function testDatabaseEnv(options) {
  if (options.dbDriver === 'sqlite') return { DB_DRIVER: 'sqlite' };
  const { host, port, database, user, password } = options.mysql;
  return { DB_DRIVER: 'mysql', MYSQL_HOST: host, MYSQL_PORT: String(port), MYSQL_DATABASE: database, MYSQL_USER: user, MYSQL_PASSWORD: password, MYSQL_SSL: 'false', MYSQL_SSL_CA: '' };
}
