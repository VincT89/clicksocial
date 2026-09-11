import { SQL } from '../server/sql.mjs';
import { randomBytes } from 'node:crypto';
import { loadConfig } from '../server/config.mjs';
import { openStore, now, uid, digest, transaction } from '../server/store.mjs';

const email = String(process.argv[2] || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new Error('Specifica l’indirizzo email confermato per l’amministratore.');
const config = loadConfig();
if (!config.localMode) throw new Error('Questo comando è riservato all’installazione locale.');
if (config.smtpHost) throw new Error('Questo comando usa la posta locale. Con SMTP attivo crea e verifica prima l’account tramite l’app.');
const db = (await openStore(config));
try {
  const result = (await transaction(db, async () => {
    let account = (await db.prepare('SELECT * FROM users WHERE email=?').get(email));
    if (account && !account.verified) throw new Error('L’account esiste ma non è verificato. Completa la verifica prima di assegnare il ruolo.');
    const created = !account;
    if (created) {
      const id = uid();
      (await db.prepare("INSERT INTO users(id,email,verified,role,plan,created_at) VALUES (?,?,1,'admin','pro',?)").run(id,email,now()));
      account = (await db.prepare('SELECT * FROM users WHERE id=?').get(id));
    } else (await db.prepare("UPDATE users SET role='admin',plan='pro' WHERE id=?").run(account.id));
    if (!account.password) {
      const token = randomBytes(32).toString('hex');
      (await db.prepare(SQL.challenge).run(email,'reset',digest(config,email+':'+token),Date.now()+1800000));
      const link = config.origin + '/reset-password?token=' + token + '&email=' + encodeURIComponent(email);
      (await db.prepare('INSERT INTO mail VALUES (?,?,?,?,?)').run(uid(),email,'Imposta la password dell’amministratore Pro','Account amministratore Pro pronto. Imposta personalmente la password entro 30 minuti:\n'+link+'\nSe il link scade, usa Password dimenticata nella pagina di accesso.',now()));
    }
    return {email,role:'admin',plan:'pro',created,passwordSetupRequired:!account.password,localMailbox:config.origin+'/dev/mail'};
  }));
  console.log(JSON.stringify(result));
} finally { (await db.close()); }

