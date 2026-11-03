import { NavLink } from 'react-router-dom';
import { SquarePen, Images, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import AdminNav from '@/components/AdminNav';

const sections = [
  { to: '/studio', label: 'Crea post', icon: SquarePen, tour: 'tab-studio' },
  { to: '/library', label: 'I miei post', icon: Images, tour: 'tab-library' },
  { to: '/profilo', label: 'Profilo', icon: UserRound, tour: 'tab-profilo' },
];

export default function WorkspaceNav({ mobile = false }) {
  const { user } = useAuth();
  return <nav aria-label="Sezioni dell’app" className={mobile ? 'workspace-tabs' : 'workspace-top-links'}>
    {sections.map(({ to, label, icon: Icon, tour }) => (
      <NavLink key={to} to={to} replace={mobile} data-tour={tour} className="workspace-nav-link">
        <Icon size={20} aria-hidden="true" /><span>{label}</span>
      </NavLink>
    ))}
    <AdminNav account={user} mobile={mobile} />
  </nav>;
}
