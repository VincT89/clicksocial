import { NavLink } from 'react-router-dom';
import { House, CalendarDays, SquarePen, ChartNoAxesCombined, UserRound, Images, Settings2, CircleHelp } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
const main = [
  { to: '/home', label: 'Home', icon: House, tour: 'tab-home' },
  { to: '/calendario', label: 'Calendario', icon: CalendarDays, tour: 'tab-calendar' },
  { to: '/studio', label: 'Crea post', icon: SquarePen, tour: 'tab-studio' },
  { to: '/statistiche', label: 'Statistiche', icon: ChartNoAxesCombined, tour: 'tab-stats' },
  { to: '/profilo', label: 'Profilo', icon: UserRound, tour: 'tab-profilo' },
];
const extra = [
  { to: '/media', label: 'Libreria media', icon: Images, tour: 'tab-library' },
  { to: '/preferenze', label: 'Preferenze', icon: Settings2, tour: 'tab-preferences' },
  { to: '/assistenza', label: 'Assistenza', icon: CircleHelp, tour: 'tab-help' },
];
export default function WorkspaceNav({ mobile = false }) {
  const { t } = useI18n();
  return <nav aria-label={t('Sezioni dell’app')} className={mobile ? 'workspace-tabs' : 'workspace-side-links'}>
    {(mobile ? main : [...main, ...extra]).map(({to, label, icon: Icon, tour}) => <NavLink key={to} to={to} replace={mobile} data-tour={tour} className="workspace-nav-link">
      <Icon size={21} aria-hidden="true" /><span>{t(mobile && to === '/studio' ? 'Crea' : label)}</span>
    </NavLink>)}
  </nav>;
}
