import { Link } from 'react-router-dom';
import { BookOpen, ChevronRight } from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import { useI18n } from '@/lib/i18n';
const questions = [
  ['Come creo un post?', 'Apri Crea post, scegli o scatta una foto e scrivi cosa vuoi comunicare. Premi Genera: potrai controllare la grafica e modificare la descrizione prima di salvare o pubblicare.'],
  ['Come collego i social?', 'In Profilo, apri Social. Collega una Pagina Facebook o un account Instagram professionale e conferma gli account dopo l’autorizzazione.'],
  ['Che differenza c’è tra pianificare e programmare?', 'Una data nel calendario organizza il lavoro. Per l’invio automatico, premi Pubblica, scegli un account collegato e attiva la programmazione con data e ora. Conferma sempre la destinazione.'],
  ['Dove ritrovo le bozze?', 'Apri Libreria dalla Home, poi Bozze. Salva in bozze conserva foto, descrizione e impostazioni per continuare in seguito.'],
  ['Posso personalizzare la grafica?', 'Apri Personalizza nello Studio. Puoi regolare foto, logo, scritte e impostazioni di generazione. I testi integrati nella foto si modificano aggiornando la richiesta e rigenerando.'],
  ['Serve lasciare il PC acceso?', 'La versione online e la versione iPhone configurata per il server funzionano con una connessione Internet, anche senza il PC acceso.'],
];
export default function Help() {
  const { t } = useI18n();
  return <><WorkspaceHeader subtitle="Assistenza" showGuide={false} /><main className="workspace-main settings-main">
    <div className="page-intro"><h1 className="workspace-title">{t('Centro assistenza')}</h1><p>{t('Le risposte per iniziare e usare ClickSocial ogni giorno.')}</p></div>
    <section className="surface-panel faq-list"><h2 className="section-title"><BookOpen size={22} aria-hidden="true" />{t('Domande frequenti')}</h2>{questions.map(([question,answer])=><details key={question}><summary>{t(question)}</summary><p>{t(answer)}</p></details>)}</section>
    <Link className="setting-link" to="/studio"><span><strong>{t('Crea un post')}</strong><small>{t('Parti dalla tua prossima foto.')}</small></span><ChevronRight size={20} aria-hidden="true" /></Link>
    <Link className="setting-link" to="/profilo?section=social"><span><strong>{t('Gestisci i collegamenti social')}</strong><small>{t('Controlla gli account e rinnova le autorizzazioni.')}</small></span><ChevronRight size={20} aria-hidden="true" /></Link>
  </main></>;
}
