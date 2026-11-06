import { useI18n, translate as translateUI } from '@/lib/i18n';
import * as Dialog from '@radix-ui/react-dialog';
import { Settings, X } from 'lucide-react';

export default function StudioDrawer({ open, onOpenChange, children, tab, onTabChange, busy = false }) {
  useI18n();
  return <Dialog.Root open={open} onOpenChange={onOpenChange}>
    <Dialog.Trigger asChild><button type="button" data-tour="studio-settings" className="studio-settings-button" aria-label={translateUI("Personalizza il post")}>
      <Settings size={19} aria-hidden="true" />{translateUI("Personalizza")}</button></Dialog.Trigger>
    <Dialog.Portal>
      <Dialog.Overlay className="studio-drawer-overlay" />
      <Dialog.Content className="studio-settings-drawer" aria-describedby="studio-settings-description">
        <div className="studio-drawer-header"><Dialog.Title className="font-heading text-xl">{translateUI("Impostazioni Studio")}</Dialog.Title><Dialog.Description id="studio-settings-description" className="text-xs text-muted-foreground mt-1">{translateUI("Personalizza questo post, poi chiudi il pannello per lavorare sulla foto.")}</Dialog.Description><Dialog.Close asChild><button type="button" className="studio-drawer-close" aria-label={translateUI("Chiudi impostazioni")} disabled={busy}><X size={22} aria-hidden="true" /></button></Dialog.Close></div>
        <div className="studio-drawer-tabs" role="group" aria-label={translateUI("Sezioni delle impostazioni")}>{[['graphic', 'Grafica'], ['photo', 'Foto'], ['copy', 'Testi e AI'], ['post', 'Post']].map(([key, label]) => <button type="button" key={key} disabled={busy} aria-pressed={tab === key} onClick={() => onTabChange(key)}>{translateUI(label)}</button>)}</div>
        <div className="studio-drawer-content" key={tab}>{children}</div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
