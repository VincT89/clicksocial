import { transaction } from './store.mjs';

export async function grantAdmin(db, email, apply = false) {
  const address = String(email || '').trim().toLowerCase();
  if (address.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) throw new Error('Specifica l’indirizzo email dell’account da autorizzare.');
  return transaction(db, async () => {
    const account = await db.prepare('SELECT id,email,verified,role FROM users WHERE email=?').get(address);
    if (!account) throw new Error('Account non trovato. Registralo prima nell’app.');
    if (!account.verified) throw new Error('Completa la verifica email nell’app prima di assegnare il ruolo.');
    /** Il comando assegna solo il ruolo: conserva password, sessioni, piano e dati dell'account. */
    if (apply) await db.prepare("UPDATE users SET role='admin' WHERE id=? AND verified=1").run(account.id);
    return { email: account.email, previousRole: account.role, role: apply ? 'admin' : account.role, applied: apply };
  });
}
