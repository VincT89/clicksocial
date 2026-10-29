import { createApp } from '../server/app.mjs';
import { readTarget } from './mobile-target.mjs';
import { isPrivateAddress } from '../shared/mobile-config.mjs';

const target = readTarget();
const url = new URL(target.origin);
if (!target.localTest || url.protocol !== 'http:' || !isPrivateAddress(url.hostname) || !url.port) throw new Error('Prepara prima un indirizzo HTTP di collaudo con host privato e porta esplicita.');
const app = await createApp({ host: url.hostname, port: Number(url.port), origin: target.origin, localMode: true, lanMode: true, scheduler: false });
try {
  await new Promise((resolve, reject) => { app.server.once('error', reject); app.server.listen(app.config.port, app.config.host, resolve); });
  console.log(`ClickSocial per il collaudo Wi-Fi: ${target.origin}`);
  console.log('Usa lo stesso Wi-Fi sul telefono e lascia acceso questo PC.');
  console.log('Per leggere i codici email locali apri anche AVVIA.cmd e visita http://127.0.0.1:5180/dev/mail sul PC.');
  console.log('Il collaudo non avvia il servizio di pubblicazione programmata.');
} catch (error) {
  await app.close();
  if (error.code === 'EADDRINUSE') console.error('La porta di collaudo è già occupata. Non è stata avviata una seconda istanza.');
  else if (error.code === 'EADDRNOTAVAIL') console.error('L’indirizzo di collaudo ' + url.hostname + ' non è assegnato a questo PC. Verifica l’indirizzo della rete Wi-Fi prima di aggiornare la configurazione; anche la build sul telefono deve usare lo stesso indirizzo.');
  else console.error(error.message);
  process.exitCode = 1;
}
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, async () => { await app.close(); process.exit(0); });
