import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
export default function ConfirmAction({ open, onOpenChange, title, description, confirmLabel, onConfirm, busy = false, destructive = false }) {
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}>
    <DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <DialogFooter className="gap-2"><Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>Annulla</Button><Button variant={destructive ? 'destructive' : 'default'} disabled={busy} onClick={onConfirm}>{busy ? 'Attendi…' : confirmLabel}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

