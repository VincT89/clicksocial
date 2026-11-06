import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import BrandLink from '@/components/BrandLink';
import WorkspaceNav from '@/components/WorkspaceNav';
import WorkspaceFooter from '@/components/WorkspaceFooter';
import AdminNav from '@/components/AdminNav';
import { Link } from 'react-router-dom';
export default function WorkspaceSidebar() {
  const { user } = useAuth();
  const { t } = useI18n();
  return <aside className="workspace-sidebar">
    <div className="workspace-sidebar-brand"><BrandLink subtitle="" /><WorkspaceFooter sidebar /></div>
    <WorkspaceNav />
    <div className="workspace-sidebar-bottom"><AdminNav account={user} />
      <Link to="/profilo" className="workspace-account"><span className="account-avatar" aria-hidden="true">{(user?.company_name || user?.full_name || user?.email || 'C').slice(0, 1).toUpperCase()}</span><span><strong>{user?.company_name || t('Il tuo profilo')}</strong><small>{t('Gestisci attività e account')}</small></span></Link>
    </div>
  </aside>;
}
