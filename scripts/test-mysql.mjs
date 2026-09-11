import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtempSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import mysql from 'mysql2/promise';

const executable = process.env.MYSQL_TEST_SERVER || 'mysqld';
const run = (command, args, options = {}) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { windowsHide: true, ...options });
  let output = '';
  child.stdout?.on('data', chunk => { output = (output + chunk).slice(-12000); });
  child.stderr?.on('data', chunk => { output = (output + chunk).slice(-12000); });
  child.on('error', reject);
  child.on('exit', code => code === 0 ? resolve(output) : reject(new Error('Comando di collaudo non riuscito: ' + output)));
});

let server, connection;
try {
  const version = await run(executable, ['--version']);
  const maria = /MariaDB/i.test(version);
  console.log('Motore del collaudo: ' + version.trim());
  mkdirSync(resolve('work/tests'), { recursive: true });
  const directory = mkdtempSync(resolve('work/tests/sql-server-'));
  const dataDir = join(directory, 'data');
  const listener = createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  if (port < 10000) throw new Error('Porta del collaudo non valida.');
  console.log('Preparazione del database temporaneo su una porta dedicata.');
  if (maria) {
    const installer = process.env.MYSQL_TEST_INSTALLER || join(dirname(executable), 'mysql_install_db.exe');
    if (!existsSync(installer)) throw new Error('Imposta MYSQL_TEST_INSTALLER con il percorso di mysql_install_db.exe.');
    await run(installer, ['--datadir=' + dataDir, '--port=' + port]);
  } else await run(executable, ['--no-defaults', '--initialize-insecure', '--datadir=' + dataDir]);
  const args = ['--no-defaults', '--datadir=' + dataDir, '--bind-address=127.0.0.1', '--port=' + port,
    '--innodb-buffer-pool-size=32M', '--log-error=' + join(directory, 'server.log'), '--pid-file=' + join(directory, 'server.pid'),
    ...(!maria ? ['--mysqlx=OFF'] : [])];
  server = spawn(executable, args, { windowsHide: true, stdio: 'ignore' });
  server.on('error', error => console.error('Avvio del server di collaudo:', error.message));
  const config = { host: '127.0.0.1', port, user: 'root', password: '', connectTimeout: 1000 };
  for (let attempt = 0; attempt < 60; attempt++) {
    try { connection = await mysql.createConnection(config); break; }
    catch { if (server.exitCode !== null) throw new Error('Il server temporaneo si è fermato. Consulta ' + join(directory, 'server.log')); await delay(500); }
  }
  if (!connection) throw new Error('Il server temporaneo non è pronto.');
  console.log('Esecuzione degli stessi flussi applicativi sul database SQL temporaneo.');
  await run(process.execPath, ['--test', 'tests/*.test.mjs'], { stdio: 'inherit', env: { ...process.env, CLICKSOCIAL_TEST_MYSQL: JSON.stringify(config) } });
  console.log('Collaudo SQL completato.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
finally {
  if (connection) {
    try { await connection.query('SHUTDOWN'); } catch { /* Il server può chiudere prima della risposta. */ }
    await connection.end().catch(() => {});
  }
  if (server && server.exitCode === null) {
    await Promise.race([new Promise(resolve => server.once('exit', resolve)), delay(10000)]);
    if (server.exitCode === null) server.kill();
  }
}
