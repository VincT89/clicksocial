import { useI18n, translate as translateUI } from '@/lib/i18n';
import { NavLink, useLocation } from 'react-router-dom';
import * as Dialog from '@radix-ui/react-dialog';
import { Building2, Code2, Menu, X } from 'lucide-react';
import { isAdminAccount } from '@/lib/adminAccess';

const sections = [
  { to: '/admin', label: 'Area azienda', detail: 'Clienti e account', icon: Building2 },
  { to: '/sviluppatore', label: 'Sviluppatore', detail: 'Verifiche e consumi AI', icon: Code2 },
];

export default function AdminNav({ account, mobile = false }) {
  useI18n();
  const { pathname } = useLocation();
  if (!isAdminAccount(account)) return null;
  const current = sections.some(section => section.to === pathname);
  return <Dialog.Root key={pathname}>
    <Dialog.Trigger asChild>
      <button type="button" className="workspace-nav-link" data-tour="profile-administration" aria-current={current ? 'true' : undefined}>
        <Menu size={20} aria-hidden="true" /><span>{translateUI("Gestione")}</span>
      </button>
    </Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="app-sheet-overlay" />
      <Dialog.Content className="app-sheet management-sheet" aria-describedby={undefined}>
        <header className="app-sheet-header">
          <Dialog.Title>{translateUI("Gestione")}</Dialog.Title>
          <Dialog.Close asChild><button type="button" className="nav-icon" aria-label={translateUI("Chiudi gestione")}><X size={20} aria-hidden="true" /></button></Dialog.Close>
        </header>
        {sections.map(({ to, label, detail, icon: Icon }) => (
          <Dialog.Close asChild key={to}>
            <NavLink to={to} replace={mobile} className="management-link">
              <Icon size={21} aria-hidden="true" />
              <span><strong>{translateUI(label)}</strong><small>{translateUI(detail)}</small></span>
            </NavLink>
          </Dialog.Close>
        ))}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
