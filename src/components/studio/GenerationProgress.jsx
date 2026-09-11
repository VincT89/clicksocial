import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useStudioState } from '@/lib/StudioStateContext';
import { isNative, openExternal } from '@/lib/mobile';
import { toast } from 'sonner';

const WEBSITE = 'https://sodanoconsulting.it/';
const MESSAGES = [
  'ClickSocial è un progetto Sodano Consulting. Dalla tua foto al tuo prossimo post.',
  'Sodano Consulting sviluppa siti web e software su misura per le aziende.',
  'Strategia social e contenuti digitali: scopri i servizi di Sodano Consulting.',
];

export default function GenerationProgress() {
  const { generating, generationStage } = useStudioState();
  const [expanded, setExpanded] = useState(false);
  const [messageIndex, setMessageIndex] = useState(0);
  const [takingLonger, setTakingLonger] = useState(false);
  const reopen = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    if (!generating) { setExpanded(false); return; }
    returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setExpanded(true); setMessageIndex(0); setTakingLonger(false);
    const rotation = window.setInterval(() => setMessageIndex(index => (index + 1) % MESSAGES.length), 8000);
    const longWait = window.setTimeout(() => setTakingLonger(true), 60000);
    return () => { window.clearInterval(rotation); window.clearTimeout(longWait); };
  }, [generating]);

  const visitWebsite = event => {
    if (!isNative) return;
    event.preventDefault();
    openExternal(WEBSITE).catch(() => toast.error('Impossibile aprire il sito. Riprova tra poco.'));
  };
  const detail = generationStage === 'logo'
    ? 'Prepariamo il logo senza sfondo e lo inseriamo nello spazio scelto per la grafica.'
    : 'Stiamo lavorando al contenuto. L’anteprima comparirà appena il post sarà pronto.';

  return <>
    {generating && <button ref={reopen} type="button" onClick={() => setExpanded(true)} aria-haspopup="dialog" aria-expanded={expanded}
      className="fixed z-40 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] md:bottom-6 left-1/2 -translate-x-1/2 flex w-[calc(100%-2rem)] max-w-sm items-center gap-3 rounded-xl border border-border bg-background px-4 py-3 text-left text-sm shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      <Loader2 className="h-5 w-5 shrink-0 text-purple motion-safe:animate-spin" aria-hidden="true" />
      <span className="min-w-0"><span className="block font-medium">Generazione in corso</span><span className="block text-xs text-foreground/75">Mostra la finestra di attesa</span></span>
    </button>}
    <Dialog open={generating && expanded} onOpenChange={setExpanded}>
      <DialogContent closeLabel="Riduci finestra di generazione"
        className="flex max-h-[calc(100dvh-2rem-env(safe-area-inset-top)-env(safe-area-inset-bottom))] w-[calc(100%-2rem)] max-w-md flex-col overflow-hidden rounded-2xl p-0 gap-0 motion-reduce:animate-none motion-reduce:transition-none [&>button]:z-10 [&>button]:bg-background"
        style={{ top: 'calc(50% + (env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)) / 2)' }}
        onCloseAutoFocus={event => {
          event.preventDefault();
          if (generating) reopen.current?.focus();
          else if (returnFocus.current?.isConnected) returnFocus.current.focus();
        }}>
        <div className="flex shrink-0 items-center gap-3 px-6 pb-5 pt-6 pr-14 text-purple-dark dark:text-accent-foreground sm:px-8 sm:pt-8 sm:pr-14">
          <Loader2 className="h-7 w-7 shrink-0 motion-safe:animate-spin" aria-hidden="true" />
          <p className="text-sm font-medium">Generazione in corso</p>
        </div>
        <div className="min-h-0 overflow-y-auto overscroll-contain">
        <div className="px-6 pb-6 sm:px-8 sm:pb-8">
          <DialogHeader className="text-left">
            <DialogTitle className="font-heading text-2xl leading-tight tracking-normal">Il tuo post sta prendendo forma</DialogTitle>
            <DialogDescription className="pt-2 text-sm leading-relaxed text-foreground/75">{detail}</DialogDescription>
          </DialogHeader>
          <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">{detail}</p>
          {takingLonger && <p className="mt-4 text-sm leading-relaxed text-foreground/75" role="status">La generazione sta richiedendo più tempo. Puoi ridurre questa finestra mentre attendi.</p>}
          <div className="mt-6 border-t border-border pt-5">
            <p className="min-h-[4.5rem] text-sm leading-relaxed text-foreground" aria-live="off">{MESSAGES[messageIndex]}</p>
            <a href={WEBSITE} target="_blank" rel="noopener noreferrer" onClick={visitWebsite}
              className="inline-flex min-h-11 items-center py-2 text-sm font-semibold text-purple-dark dark:text-accent-foreground underline underline-offset-4 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Scopri Sodano Consulting<span className="sr-only">, si apre nel browser in una nuova finestra</span>
            </a>
          </div>
        </div>
        <p className="border-t border-border bg-muted/40 px-6 py-4 sm:px-8 text-xs leading-relaxed text-foreground/75">Puoi ridurre questa finestra: la generazione continua.</p>
        </div>
      </DialogContent>
    </Dialog>
  </>;
}
