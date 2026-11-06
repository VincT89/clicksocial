import AppSelect from '@/components/AppSelect';
import { useAuth } from '@/lib/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import HelpButton from '@/components/HelpButton';
import { TOURS } from '@/lib/tours';
import { ChevronLeft, CircleHelp, UserRound } from 'lucide-react';
import BrandLink from '@/components/BrandLink';
import ThemeToggle from '@/components/ThemeToggle';
import IPhonePreview from '@/components/IPhonePreview';
import { useI18n } from '@/lib/i18n';
export default function WorkspaceHeader({ subtitle = '', actions = null, showGuide = true, navigation = null, backToHome = false }) {
  const { isAuthenticated, user } = useAuth();
  const { pathname } = useLocation();
  const { language, setLanguage, t } = useI18n();
  const accountName = (user?.full_name || user?.company_name || '').trim();
  const initials = accountName.split(/\s+/).slice(0, 2).map(word => word.charAt(0)).join('').toLocaleUpperCase();
  return <header className={`workspace-header safe-top ${isAuthenticated ? '' : 'public-header'} ${backToHome ? 'workspace-back-header' : ''}`}><div className="workspace-header-inner">
    {backToHome ? <div className="workspace-back-title">
      <Link to="/home" aria-label={t('Torna alla Home')}><ChevronLeft size={23} aria-hidden="true" /></Link>
      <h1>{t(subtitle)}</h1>
    </div> : <>
      <div className="workspace-mobile-brand"><BrandLink subtitle="" /></div>
      <p className="workspace-desktop-title">{t(subtitle)}</p>
    </>}
    {navigation}
    <div className="workspace-header-actions">
      <label className="language-control"><span className="sr-only">{t('Lingua dell’app')}</span><AppSelect id="header-language" value={language} onChange={event => setLanguage(event.target.value)} aria-label={t('Lingua dell’app')}><option value="it">IT</option><option value="en">EN</option><option value="de">DE</option></AppSelect></label>
      <IPhonePreview /><ThemeToggle withLabel />
      {showGuide && TOURS[pathname] ? <HelpButton withLabel /> : showGuide && isAuthenticated && <Link to="/assistenza" className="nav-icon nav-labeled header-help" aria-label={t('Assistenza')}><CircleHelp size={21} aria-hidden="true" /><span>{t('Assistenza')}</span></Link>}
      {isAuthenticated && <Link to="/profilo" className="nav-icon nav-labeled header-profile" aria-label={t('Il tuo profilo')}><UserRound size={21} aria-hidden="true" /><span>{t('Profilo')}</span></Link>}
      {isAuthenticated && pathname === '/home' && <Link to="/profilo" className="home-account-link" aria-label={t('Il tuo profilo')}>
        <span className="account-avatar" aria-hidden="true">{initials || <UserRound size={18} />}</span>
      </Link>}
      {actions}
    </div>
  </div></header>;
}
