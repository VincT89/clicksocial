import { useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { useSize } from '@/hooks/use-size';
import { Button } from '@/components/ui/button';

export default function PostCaption({ platform, value, onChange, readOnly, disabled }) {
  const frame = useRef(null), input = useRef(null), label = useRef(null), trigger = useRef(null), sheetTitle = useRef(null);
  const size = useSize(frame);
  const [long, setLong] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const title = platform ? 'Descrizione per ' + platform : 'Descrizione del post';
  const placeholder = 'Scrivi il testo che accompagnerà la foto';

  useLayoutEffect(() => {
    const field = input.current;
    if (field) setLong(field.scrollHeight > field.clientHeight + 1);
  }, [value, size?.width, size?.height]);

  const changeOpen = next => {
    if (next) setDraft(value);
    setOpen(next);
  };

  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <div className="studio-caption" data-tour="studio-copy-result">
      <div className="studio-caption-heading">
        <label ref={label} tabIndex={-1} htmlFor="post-caption" className="text-sm font-medium">{title}</label>
        {(long || open) && <Dialog.Trigger asChild>
          <button ref={trigger} type="button" disabled={disabled}>{readOnly ? 'Leggi tutto' : 'Leggi e modifica'}</button>
        </Dialog.Trigger>}
      </div>
      <div className="studio-caption-field" ref={frame} data-text={value || placeholder}>
        <textarea ref={input} id="post-caption" rows={1} value={value} onChange={event => onChange(event.target.value)}
          maxLength={10000} readOnly={readOnly} disabled={disabled} placeholder={placeholder} />
      </div>
    </div>
    <Dialog.Portal>
      <Dialog.Overlay className="app-sheet-overlay" />
      <Dialog.Content className="app-sheet caption-sheet" aria-describedby={undefined}
        onOpenAutoFocus={event => { event.preventDefault(); sheetTitle.current?.focus({ preventScroll: true }); }}
        onCloseAutoFocus={event => { if (!trigger.current) { event.preventDefault(); label.current?.focus({ preventScroll: true }); } }}>
        <header className="app-sheet-header">
          <Dialog.Title ref={sheetTitle} tabIndex={-1}>{title}</Dialog.Title>
          <Dialog.Close asChild><button type="button" className="nav-icon" aria-label="Chiudi descrizione"><X size={20} aria-hidden="true" /></button></Dialog.Close>
        </header>
        <label htmlFor="caption-full" className="text-sm font-medium">Testo e hashtag</label>
        <textarea id="caption-full" value={draft} onChange={event => setDraft(event.target.value)} rows={8} maxLength={10000} readOnly={readOnly} />
        {!readOnly && <Button className="min-h-11" onClick={() => { onChange(draft); setOpen(false); }}>Applica al post</Button>}
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}
