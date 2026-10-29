/** Passenger carica CommonJS; l'import dinamico mantiene il backend ESM e il suo avvio asincrono. */
process.env.NODE_ENV = 'production';
import('./server/index.mjs').catch(() => {
  console.error('Avvio ClickSocial non riuscito. Verifica installazione e configurazione del server.');
  process.exitCode = 1;
});
