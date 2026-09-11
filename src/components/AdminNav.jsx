import { NavLink } from 'react-router-dom';
import { Building2, Code2 } from 'lucide-react';
import { isAdminAccount } from '@/lib/adminAccess';
import IconHint from '@/components/IconHint';

const sections = [
  { to: '/admin', label: 'Area azienda', icon: Building2 },
  { to: '/sviluppatore', label: 'Sviluppatore', icon: Code2 },
];

export default function AdminNav({ account, mobile = false, onNavigate = undefined }) {
  if (!isAdminAccount(account)) return null;
  return <div role="group" aria-label="Amministrazione" data-tour="profile-administration" className="flex items-center gap-1 border-l border-border pl-2">
    {sections.map(({ to, label, icon: Icon }) => <IconHint key={to} label={label} side={mobile ? 'top' : 'bottom'}><NavLink to={to} aria-label={label} onClick={onNavigate ? event => onNavigate(event, to) : undefined} className="nav-icon"><Icon size={20} aria-hidden="true" /></NavLink></IconHint>)}
  </div>;
}
