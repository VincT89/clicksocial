import AppSelect from '@/components/AppSelect';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { useI18n } from '@/lib/i18n';
import { useTheme } from '@/hooks/useDarkMode';
export default function Preferences() {
  const { t, language, setLanguage } = useI18n();
  const { preference, setPreference } = useTheme();
  return <><WorkspaceHeader subtitle="Preferenze" /><main className="workspace-main settings-main">
    <div className="page-intro"><h1 className="workspace-title">{t('Preferenze')}</h1><p>{t('Scegli come usare ClickSocial su questo dispositivo.')}</p></div>
    <section className="surface-panel"><h2 className="section-title">{t('Aspetto')}</h2>
      <div className="theme-options" role="group" aria-label={t('Tema dell’app')}>{[{value:'light',label:'Chiaro'},{value:'dark',label:'Scuro'},{value:'system',label:'Sistema'}].map(({value,label}) => <button type="button" key={value} aria-pressed={preference === value} onClick={() => setPreference(value)}><span>{t(label)}</span></button>)}</div>
    </section>
    <section className="surface-panel"><label className="setting-select" htmlFor="app-language"><span><strong>{t('Lingua dell’app')}</strong><small>{t('Le foto e i testi dei tuoi post restano invariati.')}</small></span><AppSelect id="app-language" value={language} onChange={event => setLanguage(event.target.value)}><option value="it">Italiano</option><option value="en">English</option><option value="de">Deutsch</option></AppSelect></label></section>
    <Link to="/impostazioni" className="setting-link"><span><strong>{t('Brand e stile dei post')}</strong><small>{t('Logo, colori, tono di voce e informazioni della tua attività.')}</small></span><ChevronRight size={20} aria-hidden="true" /></Link>
    <Link to="/profilo?section=account" className="setting-link"><span><strong>{t('Impostazioni account')}</strong><small>{t('Accesso e gestione dei tuoi dati.')}</small></span><ChevronRight size={20} aria-hidden="true" /></Link>
  </main></>;
}
