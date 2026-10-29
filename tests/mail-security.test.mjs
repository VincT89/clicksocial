import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { createIntegrations } from '../server/integrations.mjs';

for (const authenticated of [false, true]) test('SMTP: rifiuta il testo in chiaro ' + (authenticated ? 'con credenziali' : 'senza credenziali'), async () => {
  const commands = [], sockets = new Set();
  const smtp = createServer(socket => {
    sockets.add(socket);
    socket.on('close', () => sockets.delete(socket));
    socket.on('error', () => {});
    socket.write('220 local.test ESMTP\r\n');
    let pending = '';
    socket.on('data', bytes => {
      pending += bytes.toString();
      let end;
      while ((end = pending.indexOf('\r\n')) !== -1) {
        const command = pending.slice(0, end).split(' ')[0].toUpperCase();
        pending = pending.slice(end + 2);
        commands.push(command);
        if (command === 'EHLO') socket.write('250-local.test\r\n250 AUTH PLAIN\r\n');
        else if (command === 'STARTTLS') socket.write('454 TLS unavailable\r\n');
        else socket.write('550 Insecure command rejected by fixture\r\n');
      }
    });
  });
  await new Promise((resolve, reject) => { smtp.once('error', reject); smtp.listen(0, '127.0.0.1', resolve); });
  try {
    const config = { smtpHost: '127.0.0.1', smtpPort: smtp.address().port, smtpSecure: false, localMode: false,
      smtpUser: authenticated ? 'fixture-user' : '', smtpPass: 'fixture-password', mailFrom: 'sender@example.test' };
    const { sendMail } = createIntegrations(null, config);
    await assert.rejects(sendMail('recipient@example.test', 'Local test', 'Local verification fixture'), error => error.code === 'ETLS');
    assert.ok(commands.includes('STARTTLS'));
    assert.ok(!commands.some(command => ['AUTH', 'MAIL', 'RCPT', 'DATA'].includes(command)));
  } finally {
    for (const socket of sockets) socket.destroy();
    await new Promise(resolve => smtp.close(resolve));
  }
});
