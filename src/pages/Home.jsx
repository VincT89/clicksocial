import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { SquarePen, Images, CalendarDays, Settings, ChevronRight } from 'lucide-react';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import WorkspacePostList from '@/components/WorkspacePostList';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import useWorkspacePosts from '@/hooks/useWorkspacePosts';
import { homePostLists } from '@/lib/postOverview.mjs';
import { Button } from '@/components/ui/button';
const shortcuts = [
  { to:'/studio?new=1', title:'Nuovo post', icon:SquarePen },
  { to:'/media', title:'Libreria media', icon:Images },
  { to:'/calendario', title:'Calendario', icon:CalendarDays },
  { to:'/impostazioni', title:'Impostazioni', icon:Settings },
];
export default function Home() {
  const { t } = useI18n();
  const { user } = useAuth();
  const { data, isPending, error, refetch } = useWorkspacePosts();
  const { programmed, recent, attention } = useMemo(() => homePostLists(data || []), [data]);
  const name = user?.full_name?.trim().split(/\s+/)[0];

  return <>
    <WorkspaceHeader subtitle="Home" />
    <main className="workspace-main home-main">
      <div className="page-intro">
        <h1 className="workspace-title">{name ? t('Ciao, {name}', { name }) : t('Il tuo spazio social')}</h1>
        <p>{t('Crea, organizza e pubblica i contenuti della tua attività.')}</p>
      </div>
      <div className="home-shortcuts">
        {shortcuts.map(({ to, title, icon: Icon }) => <Link className="home-shortcut" key={to} to={to}>
          <Icon size={25} aria-hidden="true" /><span>{t(title)}</span>
        </Link>)}
      </div>
      {error ? <section className="surface-panel" role="alert">
        <p>{t('Impossibile caricare i contenuti.')}</p><Button variant="outline" onClick={() => refetch()}>{t('Riprova')}</Button>
      </section> : isPending ? <p role="status">{t('Caricamento dei contenuti…')}</p> : <>
        {attention.length > 0 && <Link className="attention-row" to="/library">
          <span>{t('Ci sono pubblicazioni da controllare: {count}', { count: attention.length })}</span><ChevronRight size={20} aria-hidden="true" />
        </Link>}
        <div className={'home-columns' + (recent.length ? ' has-recent' : '')}>
          <section className="surface-panel" aria-labelledby="home-programmed">
            <div className="section-heading">
              <h2 id="home-programmed">{t('Post programmati')}</h2>
              {programmed.length > 0 && <Link to="/library?stage=programmato">{t('Vedi tutti')}<ChevronRight size={15} aria-hidden="true" /></Link>}
            </div>
            {programmed.length ? <WorkspacePostList posts={programmed} /> : <div className="empty-content">
              <p>{t('Non hai post programmati.')}</p><Link to="/calendario">{t('Apri calendario')}</Link>
            </div>}
          </section>
          {recent.length > 0 && <section className="surface-panel" aria-labelledby="home-recent">
            <div className="section-heading">
              <h2 id="home-recent">{t('I tuoi ultimi contenuti')}</h2>
              <Link to="/library">{t('Tutti i post')}<ChevronRight size={15} aria-hidden="true" /></Link>
            </div>
            <WorkspacePostList posts={recent} />
          </section>}
        </div>
      </>}
      <Link to="/profilo?section=social" className="home-channels-link">{t('Canali social')}<ChevronRight size={15} aria-hidden="true" /></Link>
    </main>
  </>;
}
