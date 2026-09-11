import { NavLink } from 'react-router-dom';
import { Sparkles, Library, UserRound } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import AdminNav from '@/components/AdminNav';
import IconHint from '@/components/IconHint';

const sections = [
  { to: '/studio', label: 'Studio', icon: Sparkles, tour: 'tab-studio' },
  { to: '/library', label: 'Libreria', icon: Library, tour: 'tab-library' },
  { to: '/profilo', label: 'Profilo', icon: UserRound, tour: 'tab-profilo' },
];

export default function WorkspaceNav({ mobile = false, onNavigate = undefined }) {
  const { user } = useAuth();
  return <nav aria-label="Sezioni dell’app" className="flex items-center justify-center gap-2">
    {sections.map(({ to, label, icon: Icon, tour }) => <IconHint key={to} label={label} side={mobile ? 'top' : 'bottom'}><NavLink to={to} aria-label={label} data-tour={tour} onClick={onNavigate ? event => onNavigate(event, to) : undefined} className="nav-icon"><Icon size={20} aria-hidden="true" /></NavLink></IconHint>)}
    <AdminNav account={user} mobile={mobile} onNavigate={onNavigate} />
  </nav>;
}
