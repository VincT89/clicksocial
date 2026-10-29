import { createApp } from './app.mjs';
let app;
try {
  app = await createApp();
  await new Promise((resolve,reject) => {
    app.server.once('error',reject);
    app.server.listen(app.config.port,app.config.host,() => { app.server.off('error',reject); resolve(); });
  });
  app.server.on('error', async error => { console.error('Errore del backend:', error.message); process.exitCode=1; await app.close(); });
  console.log('ClickSocial: ' + app.config.origin);
  console.log(app.db.kind === 'mysql' ? 'Database MySQL: ' + app.config.mysql.database : 'Database SQLite: ' + app.config.dataDir);
  if (app.config.scheduler) app.integrations.publishDuePosts().catch(e=>console.error('Scheduler:',e.message));
} catch (error) {
  console.error('Impossibile avviare il backend:', error.message);
  process.exitCode=1;
  if (app) await app.close();
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{ if (app) await app.close(); process.exit(0); });
