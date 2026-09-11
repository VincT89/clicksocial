import { createServer } from 'node:net';

export async function localStatus({ host = '127.0.0.1', port = 5180 } = {}) {
  const available = await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', error => error.code === 'EADDRINUSE' ? resolve(false) : reject(error));
    probe.listen({ host, port, exclusive: true }, () => {
      probe.close(error => error ? reject(error) : resolve(true));
    });
  });
  if (available) return 'available';
  try {
    const response = await fetch(`http://${host}:${port}/api/health`, {
      signal: AbortSignal.timeout(2000), redirect: 'error',
    });
    if (response.ok) {
      const health = await response.json();
      if (health.ok === true && health.database === true && health.backend === 'local') return 'running';
    }
  } catch { /* Una porta occupata non garantisce che risponda ClickSocial. */ }
  return 'occupied';
}

export function reportLocalStatus(status) {
  if (status === 'running') {
    console.log('ClickSocial è già in esecuzione: http://127.0.0.1:5180');
    console.log('Per usare l’app basta aprire questo indirizzo.');
    console.log('Per applicare modifiche al codice o al file .env, ferma prima l’istanza già attiva con Ctrl+C nel suo terminale e poi riavviala.');
    return 0;
  }
  console.error('La porta 5180 è occupata, ma non risponde un’istanza funzionante di ClickSocial.');
  console.error('Controlla il programma che usa questa porta prima di riprovare. Nessun processo è stato arrestato.');
  return 1;
}
