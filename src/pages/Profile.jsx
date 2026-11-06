import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '@/api/client';
import CompanyCard from '@/components/profile/CompanyCard';
import DeleteAccountModal from '@/components/profile/DeleteAccountModal';
import SocialConnections from '@/components/social/SocialConnections';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import AdminNav from '@/components/AdminNav';

const sections = [{ id: 'company', label: 'Attività' }, { id: 'social', label: 'Social' }, { id: 'plan', label: 'Piano' }, { id: 'account', label: 'Account' }];
export default function Profile() {
  useI18n();
  const { user, appPublicSettings, logout } = useAuth();
  const [me, setMe] = useState(user);
  const [postCount, setPostCount] = useState(null);
  const [error, setError] = useState('');
  const [section, setSection] = useState('company');
  const [upgrading, setUpgrading] = useState(false);
  const [params, setParams] = useSearchParams();
  const settings = appPublicSettings?.public_settings || {};
  useEffect(() => { const target = params.get('section'); if (sections.some(item => item.id === target)) setSection(target); }, [params]);
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
    toast.info(checkout === 'success' ? translateUI("Il piano si aggiorna dopo la conferma di Stripe.") : translateUI("Pagamento annullato."));
    const next = new URLSearchParams(params); next.delete('checkout'); setParams(next, { replace: true });
  }, [params, setParams]);
  const handleLogout = () => logout().catch(e => toast.error(translateUI("Uscita non riuscita: ") + translateUI(e.message)));
  const upgrade = async () => {
    setUpgrading(true);
    try { const result = await api.functions.invoke('createCheckout'); window.location.assign(result.data.url); }
    catch (e) { toast.error(translateUI(e.message)); setUpgrading(false); }
  };
  const refreshPlan = async () => {
    try { setMe(await api.auth.me()); toast.success(translateUI("Piano aggiornato")); }
    catch (e) { toast.error(translateUI(e.message)); }
  };
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader subtitle={translateUI("Profilo")} />
    <main className="workspace-main profile-main space-y-5">
      <div className="profile-utilities"><Link to="/preferenze">{translateUI("Preferenze")}</Link><Link to="/assistenza">{translateUI("Assistenza")}</Link><AdminNav account={user} /></div>
      <div data-tour="profile-account" className="profile-overview flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0"><h1 className="workspace-title">{translateUI("Il tuo profilo")}</h1><p className="mt-2 text-sm text-muted-foreground break-all">{me?.email}</p></div>
        <div className="text-sm sm:text-right"><p className="font-medium text-purple">{me?.plan === 'pro' ? translateUI("Piano Pro") : translateUI("Piano Gratuito")}{me?.role === 'admin' ? translateUI(" · Amministratore") : ''}</p><p className="text-muted-foreground mt-1">{postCount === null ? translateUI("Conteggio post non disponibile") : postCount + (postCount === 1 ? translateUI(" post salvato") : translateUI(" post salvati"))}</p></div>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{translateUI("Non riesco ad aggiornare tutti i dati:")} {translateUI(error)}</p>}
      <nav aria-label={translateUI("Voci del profilo")} data-tour="profile-navigation" className="section-tabs">
        {sections.map(s => <button key={s.id} type="button" aria-pressed={section === s.id} onClick={() => setSection(s.id)}
          className="section-tab">{translateUI(s.label)}</button>)}
      </nav>
      <section hidden={section !== 'company'} data-tour="profile-company" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-xl mb-2">{translateUI("La tua attività")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{translateUI("Informazioni, loghi, font e colori vengono recuperati automaticamente per i nuovi post. I contenuti già salvati conservano la propria identità grafica.")}</p>
        {me && <CompanyCard me={me} onSaved={setMe} />}
      </section>
      <section hidden={section !== 'social'} data-tour="profile-social" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6">
        <h2 className="font-heading text-xl mb-2">{translateUI("Social collegati")}</h2>
        <p className="text-sm text-muted-foreground mb-6">{translateUI("Gestisci gli account della tua attività. Prima di ogni invio scegli e confermi dove pubblicare.")}</p>
        <SocialConnections active={section === 'social'} />
        {settings.googleEnabled && <Button variant="outline" onClick={() => api.auth.loginWithProvider('google', '/profilo').catch(e => toast.error(translateUI(e.message)))}>{translateUI("Collega accesso Google")}</Button>}
      </section>
      <section hidden={section !== 'plan'} data-tour="profile-plan" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <h2 className="font-heading text-xl">{me?.plan === 'pro' ? translateUI("Piano Pro attivo") : translateUI("Piano Gratuito")}</h2>
        <div><h3 className="font-medium">{translateUI("Incluso per tutti")}</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-2"><li>{translateUI("Foto dal dispositivo o dalla fotocamera, ritocco e testi modificabili")}</li><li>{translateUI("Libreria con calendario e note")}</li><li>{translateUI("Download di foto e testi")}</li><li>{translateUI("Due generazioni AI gratuite, quando il servizio è configurato")}</li></ul>
        </div>
        <div className="border-t border-border pt-5"><h3 className="font-medium">{translateUI("Con Pro")}</h3>
          <ul className="list-disc pl-5 text-sm text-muted-foreground mt-2 space-y-2"><li>{translateUI("Generazioni AI senza il limite del piano gratuito")}</li><li>{translateUI("Invio delle foto ai social collegati, subito o programmato")}</li></ul>
          <p className="text-xs text-muted-foreground mt-4">{translateUI("AI e integrazioni social devono essere attivati dal gestore. La disponibilità della pubblicazione dipende anche dalle autorizzazioni dei social.")}</p>
        </div>
        {me?.plan !== 'pro' && <><p className="text-sm">{translateUI("Generazioni gratuite utilizzate:")} {me?.ai_generations_used || 0} {translateUI("di 2.")}</p>
          <Button onClick={upgrade} disabled={upgrading || !settings.stripeEnabled}>{upgrading ? translateUI("Apertura pagamento…") : settings.stripeEnabled ? translateUI("Passa a Pro") : translateUI("Pagamenti da configurare")}</Button></>}
        <Button variant="outline" className="ml-0 sm:ml-3" onClick={refreshPlan}>{translateUI("Aggiorna stato del piano")}</Button>
      </section>
      <section hidden={section !== 'account'} data-tour="profile-access" className="max-w-4xl rounded-xl border border-border bg-card p-5 sm:p-6 space-y-5">
        <h2 className="font-heading text-xl">{translateUI("Account")}</h2>
        <div><p className="text-sm text-muted-foreground mb-3">{translateUI("Gestisci l’accesso senza perdere i contenuti salvati.")}</p><Button variant="outline" asChild><Link to="/forgot-password">{translateUI("Imposta o cambia password")}</Link></Button></div>
        <div><Button variant="outline" data-tour="profile-logout" onClick={handleLogout}>{translateUI("Esci dall’account")}</Button></div>
        <div className="pt-4 border-t border-border"><p className="text-sm text-muted-foreground mb-3">{translateUI("L’eliminazione dell’account cancella definitivamente i dati e annulla l’eventuale abbonamento.")}</p><DeleteAccountModal me={me} /></div>
      </section>
    </main>
  </div>;
}

