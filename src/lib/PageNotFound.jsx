import { Link } from 'react-router-dom';
import { useI18n } from '@/lib/i18n';
export default function PageNotFound() {
  const { t } = useI18n();
  return <main className="workspace-main"><h1 className="workspace-title">{t('Pagina non trovata')}</h1><p className="mt-3 text-muted-foreground">{t('La pagina richiesta non è disponibile.')}</p><Link className="app-primary-button inline-flex mt-6" to="/">{t('Torna alla Home')}</Link></main>;
}
