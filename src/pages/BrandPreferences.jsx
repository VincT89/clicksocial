import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Settings } from 'lucide-react';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import CompanyCard from '@/components/profile/CompanyCard';
import { Button } from '@/components/ui/button';
export default function BrandPreferences() {
  const { t } = useI18n();
  const { user, checkAppState } = useAuth();
  const cache = useQueryClient();
  const accountKey = ['brand-account', user?.id];
  /** La chiusura dell’anteprima aggiorna le query del desktop, compresi i dati del brand salvati dall’iPhone. */
  const { data:account, isError, isPending, refetch } = useQuery({
    queryKey:accountKey, queryFn:() => api.auth.me(), enabled:!!user, refetchOnMount:'always', retry:false,
  });
  const accountSaved = async saved => {
    await cache.cancelQueries({ queryKey:accountKey, exact:true });
    cache.setQueryData(accountKey, saved);
    void checkAppState({ silent:true });
  };
  return <>
    <WorkspaceHeader subtitle="Impostazioni" backToHome />
    <main className="workspace-main settings-main brand-settings-main">
      <p className="brand-settings-intro">
        <span className="brand-intro-icon"><Settings size={25} aria-hidden="true" /></span>
        <span>{t('Configura il tuo brand e lo stile dei tuoi contenuti.')}</span>
      </p>
      {isError && <div className="brand-load-error" role="alert">
        <p>{t('Impossibile caricare i dati della tua attività.')}</p>
        <Button variant="outline" onClick={() => refetch()}>{t('Riprova')}</Button>
      </div>}
      {isPending && <p role="status">{t('Caricamento dei contenuti…')}</p>}
      {account && <CompanyCard key={account.id} me={account} onSaved={accountSaved} hideUnchangedSave />}
    </main>
  </>;
}
