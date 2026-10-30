import * as Dialog from '@radix-ui/react-dialog';
import { Settings, X } from 'lucide-react';

export default function StudioDrawer({ open, onOpenChange, children, tab, onTabChange, busy = false }) {
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Trigger asChild><button type="button" data-tour="studio-settings" className="studio-settings-button" aria-label="Apri impostazioni Studio" title="Impostazioni Studio"><Settings size={24} aria-hidden="true" /></button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="studio-drawer-overlay" />
      <Dialog.Content className="studio-settings-drawer" aria-describedby="studio-settings-description">
        <div className="studio-drawer-header"><Dialog.Title className="font-heading text-xl">Impostazioni Studio</Dialog.Title><Dialog.Description id="studio-settings-description" className="text-xs text-muted-foreground mt-1">Personalizza questo post, poi chiudi il pannello per lavorare sulla foto.</Dialog.Description><Dialog.Close asChild><button type="button" className="studio-drawer-close" aria-label="Chiudi impostazioni" disabled={busy}><X size={22} aria-hidden="true" /></button></Dialog.Close></div>
        <div className="studio-drawer-tabs" role="group" aria-label="Sezioni delle impostazioni">{[['graphic', 'Grafica'], ['photo', 'Foto'], ['copy', 'Testi e AI'], ['post', 'Post']].map(([key, label]) => <button type="button" key={key} disabled={busy} aria-pressed={tab === key} onClick={() => onTabChange(key)}>{label}</button>)}</div>
        <div className="studio-drawer-content" key={tab}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
