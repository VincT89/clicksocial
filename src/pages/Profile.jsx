import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import CompanyCard from '@/components/profile/CompanyCard';
import DeleteAccountModal from '@/components/profile/DeleteAccountModal';
import SocialConnections from '@/components/social/SocialConnections';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import IconHint from '@/components/IconHint';

const sections = [{ id: 'company', label: 'Attività' }, { id: 'social', label: 'Social' }, { id: 'plan', label: 'Piano' }, { id: 'account', label: 'Account' }];
export default function Profile() {
  const { user, appPublicSettings, logout } = useAuth();
  const [me, setMe] = useState(user);
  const [postCount, setPostCount] = useState(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState('company');
  const [upgrading, setUpgrading] = useState(false);
  const [params, setParams] = useSearchParams();
  const settings = appPublicSettings?.public_settings || {};
  useEffect(() => {
    let active = true;
    Promise.all([api.auth.me(), api.entities.Post.list()]).then(([account, posts]) => {
      if (active) { setMe(account); setPostCount(posts.length); }
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    const checkout = params.get('checkout');
    if (!checkout) return;
    setSection('plan');
    toast.info(checkout === 'success' ? 'Il piano si aggiorna dopo la conferma di Stripe.' : 'Pagamento annullato.');
    const next = new URLSearchParams(params); next.delete('checkout'); setParams(next, { replace: true });
  }, [params, setParams]);
  const handleLogout = () => logout().catch(e => toast.error('Uscita non riuscita: ' + e.message));
  const upgrade = async () => {
    setUpgrading(true);
    try { const result = await api.functions.invoke('createCheckout'); window.location.assign(result.data.url); }
    catch (e) { toast.error(e.message); setUpgrading(false); }
  };
  const refreshPlan = async () => {
    try { setMe(await api.auth.me()); toast.success('Piano aggiornato'); }
    catch (e) { toast.error(e.message); }
  };
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader subtitle="Profilo" actions={<IconHint label="Esci dall’account"><button type="button" onClick={handleLogout} aria-label="Esci dall’account" className="nav-icon"><LogOut size={20} aria-hidden="true" /></button></IconHint>} />
    <main className="workspace-main space-y-5">
      <div data-tour="profile-account" className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h1 className="workspace-title">Il tuo profilo</h1><p className="mt-2 text-sm text-muted-foreground break-all">{me?.email}</p></div>
        <div className="text-sm sm:text-right"><p className="font-medium text-purple">{me?.plan === 'pro' ? 'Piano Pro' : 'Piano Gratuito'}{me?.role === 'admin' ? ' · Amministratore' : ''}</p><p className="text-muted-foreground mt-1">{postCount === null ? 'Conteggio post non disponibile' : postCount + (postCount === 1 ? ' post salvato' : ' post salvati')}</p></div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">Non riesco ad aggiornare tutti i dati: {error}</p>}
      <nav aria-label="Voci del profilo" data-tour="profile-navigation" className="section-tabs">
        {sections.map(s => <button key={s.id} type="button" aria-pressed={section === s.id} onClick={() => setSection(s.id)}
          className="section-tab">{s.label}</button>)}
      </nav>
      <section hidden={section !== 'company'} data-tour="profile-company" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-xl mb-2">La tua attività</h2>
        <p className="text-sm text-muted-foreground mb-6">Queste informazioni guidano i testi creati con AI. Scegli il tono di voce che rappresenta il tuo brand.</p>
        {me && <CompanyCard me={me} onSaved={setMe} />}
      </section>
      <section hidden={section !== 'social'} data-tour="profile-social" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-xl mb-2">Social collegati</h2>
        <p className="text-sm text-muted-foreground mb-6">Collega una Pagina Facebook per l’invio programmato. Instagram e TikTok prevedono download e pubblicazione manuale.</p>
        <SocialConnections />
        {settings.googleEnabled && <Button variant="outline" onClick={() => api.auth.loginWithProvider('google', '/profilo').catch(e => toast.error(e.message))}>Collega accesso Google</Button>}
      </section>
      <section hidden={section !== 'plan'} data-tour="profile-plan" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <h2 className="font-heading text-xl">{me?.plan === 'pro' ? 'Piano Pro attivo' : 'Piano Gratuito'}</h2>
        <div><h3 className="font-medium">Incluso per tutti</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-2"><li>Foto dal dispositivo o dalla fotocamera, ritocco e testi modificabili</li><li>Libreria con calendario e note</li><li>Download di foto e testi</li><li>Due generazioni AI gratuite, quando il servizio è configurato</li></ul>
        </div>
        <div className="border-t border-border pt-5"><h3 className="font-medium">Con Pro</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-2"><li>Generazioni AI senza il limite del piano gratuito</li><li>Invio programmato sulle Pagine Facebook collegate</li></ul>
          <p className="text-xs text-muted-foreground mt-4">AI e Facebook devono essere configurati anche con Pro. I costi dei fornitori esterni dipendono dai rispettivi account.</p>
        </div>
        {me?.plan !== 'pro' && <><p className="text-sm">Generazioni gratuite utilizzate: {me?.ai_generations_used || 0} di 2.</p>
          <Button onClick={upgrade} disabled={upgrading || !settings.stripeEnabled}>{upgrading ? 'Apertura pagamento…' : settings.stripeEnabled ? 'Passa a Pro' : 'Pagamenti da configurare'}</Button></>}
        <Button variant="outline" className="ml-0 sm:ml-3" onClick={refreshPlan}>Aggiorna stato del piano</Button>
      </section>
      <section hidden={section !== 'account'} className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <h2 className="font-heading text-xl">Account</h2>
        <div><p className="text-sm text-muted-foreground mb-3">Gestisci l’accesso senza perdere i contenuti salvati.</p><Button variant="outline" asChild><Link to="/forgot-password">Imposta o cambia password</Link></Button></div>
        <div><Button variant="outline" data-tour="profile-logout" onClick={handleLogout}>Esci dall’account</Button></div>
        <div className="pt-4 border-t border-border"><p className="text-sm text-muted-foreground mb-3">L’eliminazione dell’account cancella definitivamente i dati e annulla l’eventuale abbonamento.</p><DeleteAccountModal me={me} /></div>
      </section>
    </main>
  </div>;
}

