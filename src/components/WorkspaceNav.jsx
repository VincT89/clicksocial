import { NavLink } from 'react-router-dom';
import { Sparkles, Library, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import AdminNav from '@/components/AdminNav';

const sections = [
  { to: '/studio', label: 'Crea post', icon: Sparkles, tour: 'tab-studio' },
  { to: '/library', label: 'Libreria', icon: Library, tour: 'tab-library' },
  { to: '/profilo', label: 'Profilo', icon: UserRound, tour: 'tab-profilo' },
];

export default function WorkspaceNav({ mobile = false, onNavigate = undefined }) {
  const { user } = useAuth();
  return <nav aria-label="Sezioni dell’app" className="flex items-center justify-center gap-1 sm:gap-2">
    {sections.map(({ to, label, icon: Icon, tour }) => <NavLink key={to} to={to} data-tour={tour} onClick={onNavigate ? event => onNavigate(event, to) : undefined} className="workspace-nav-link"><Icon size={19} aria-hidden="true" /><span>{label}</span></NavLink>)}
    <AdminNav account={user} mobile={mobile} onNavigate={onNavigate} />
  </nav>;
}
