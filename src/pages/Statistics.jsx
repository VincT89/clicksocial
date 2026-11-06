import AppSelect from '@/components/AppSelect';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, CalendarDays, Send, CircleAlert } from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import WorkspacePostList from '@/components/WorkspacePostList';
import useWorkspacePosts from '@/hooks/useWorkspacePosts';
import { useI18n } from '@/lib/i18n';
import { overview, publicationHistory } from '@/lib/postOverview.mjs';
import { Button } from '@/components/ui/button';
export default function Statistics() {
  const { t, locale } = useI18n();
  const { data, isPending, error, refetch } = useWorkspacePosts();
  const [days, setDays] = useState(30);
  const summary = overview(data || []);
  const history = publicationHistory(data || [], days);
  const totals = ['instagram', 'facebook'].map(platform => ({platform, count:history.filter(post => post.platform === platform).length}));
  const max = Math.max(1,...totals.map(item => item.count));
  return <><WorkspaceHeader subtitle="Statistiche" /><main className="workspace-main">
    <div className="page-intro"><h1 className="workspace-title">{t('Statistiche')}</h1><p>{t('Il riepilogo dei contenuti salvati in ClickSocial.')}</p></div>
    {error ? <div className="surface-panel" role="alert"><p>{t('Impossibile caricare i contenuti.')}</p><Button onClick={() => refetch()}>{t('Riprova')}</Button></div> : isPending ? <p role="status">{t('Caricamento dei contenuti…')}</p> : <>
      <div className="content-metrics">{[{label:'Bozze',value:summary.drafts.length,icon:FileText},{label:'Invii programmati',value:summary.scheduled.length,icon:CalendarDays},{label:'Pubblicati',value:summary.published.length,icon:Send},{label:'Da verificare',value:summary.attention.length,icon:CircleAlert}].map(({label,value,icon:Icon}) => <div className="surface-panel metric" key={label}><Icon size={23} aria-hidden="true" /><span>{t(label)}</span><strong>{value.toLocaleString(locale)}</strong></div>)}</div>
      <section className="surface-panel"><div className="section-heading"><h2>{t('Pubblicazioni registrate')}</h2><label><span className="sr-only">{t('Periodo')}</span><AppSelect id="statistics-period" value={days} onChange={event => setDays(Number(event.target.value))}><option value={7}>{t('Ultimi 7 giorni')}</option><option value={30}>{t('Ultimi 30 giorni')}</option><option value={90}>{t('Ultimi 90 giorni')}</option></AppSelect></label></div>
        <div className="publication-bars">{totals.map(({platform,count}) => <div key={platform}><span>{platform === 'instagram' ? 'Instagram' : 'Facebook'}</span><div className="bar-track" aria-hidden="true"><div style={{width:(count/max*100)+'%'}} /></div><strong>{count.toLocaleString(locale)}</strong></div>)}</div>
        <p className="panel-note">{t('Sono inclusi gli invii confermati e le pubblicazioni manuali registrate con una data. Follower, copertura e interazioni dei social non sono ancora disponibili.')}</p>
      </section>
      <section className="surface-panel"><div className="section-heading"><h2>{t('Ultimi post pubblicati')}</h2><Link to="/library?view=published">{t('Vedi tutti')}</Link></div>{summary.published.length ? <WorkspacePostList posts={[...summary.published].sort((a,b)=>String(b.published_at||'').localeCompare(String(a.published_at||''))).slice(0,5)} /> : <p className="empty-content">{t('Non ci sono ancora pubblicazioni registrate.')}</p>}</section>
    </>}
  </main></>;
}
