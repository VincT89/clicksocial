import { createApp } from './app.mjs';
let app;
try {
  app = await createApp();
  await new Promise((resolve,reject) => {
    app.server.once('error',reject);
    app.server.listen(app.config.port,app.config.host,() => { app.server.off('error',reject); resolve(); });
  });
  app.server.on('error', async error => { console.error('Errore del backend:', error.message); process.exitCode=1; await app.close(); });
  await app.db.prepare(`UPDATE posts SET data=json_set(data,'$.status','fallito','$.schedule_error','Pubblicazione interrotta: verifica la Pagina Facebook prima di riprogrammare.') WHERE ${app.db.json('status')}='in_pubblicazione'`).run();
  console.log('ClickSocial backend: http://127.0.0.1:'+app.config.port);
  console.log(app.db.kind === 'mysql' ? 'Database MySQL: ' + app.config.mysql.database : 'Database SQLite: ' + app.config.dataDir);
  app.integrations.publishDuePosts().catch(e=>console.error('Scheduler:',e.message));
} catch (error) {
  console.error('Impossibile avviare il backend:', error.message);
  process.exitCode=1;
  if (app) await app.close();
}
for (const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{ if (app) await app.close(); process.exit(0); });
