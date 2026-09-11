import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useTour } from '@/lib/TourContext';
import { Button } from '@/components/ui/button';
import { visibleTourTarget } from '@/lib/tourTargets';

export default function TourOverlay() {
  const { steps, stepIndex, next, prev, skip } = useTour();
  const step = steps[stepIndex];
  const tip = useRef(null);
  const [position, setPosition] = useState({ left: 12, top: 80 });
  const [rect, setRect] = useState(null);
  const active = !!step;
  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement;
    tip.current?.focus({ preventScroll: true });
    const escape = event => { if (event.key === 'Escape') skip(); };
    window.addEventListener('keydown', escape);
    const modal = new MutationObserver(() => {
      if (document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]')) skip();
    });
    modal.observe(document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['data-state'] });
    return () => {
      modal.disconnect();
      window.removeEventListener('keydown', escape);
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [active, skip]);
  useLayoutEffect(() => {
    if (!step) return;
    let target = visibleTourTarget(step.selector);
    target?.scrollIntoView({ block: 'center', behavior: 'instant' });
    const measure = () => {
      target = visibleTourTarget(step.selector);
      const box = target?.isConnected ? target.getBoundingClientRect() : null;
      const visible = box && box.width && box.height;
      setRect(visible ? { top: box.top, left: box.left, width: box.width, height: box.height } : null);
      const width = tip.current?.offsetWidth || 320;
      const height = tip.current?.offsetHeight || 240;
      const vw = window.innerWidth, vh = window.innerHeight;
      const left = visible ? box.left + box.width / 2 - width / 2 : (vw - width) / 2;
      const below = visible && box.bottom + height + 16 <= vh;
      const top = visible ? (below ? box.bottom + 12 : box.top - height - 12) : (vh - height) / 2;
      setPosition({ left: Math.max(12, Math.min(vw - width - 12, left)), top: Math.max(12, Math.min(vh - height - 12, top)) });
    };
    measure();
    const observer = new ResizeObserver(measure);
    if (target) observer.observe(target);
    if (tip.current) observer.observe(tip.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => { observer.disconnect(); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [step]);
  if (!step) return null;
  return <div className="fixed inset-0 z-[60] pointer-events-none">
    {rect && <div aria-hidden="true" className="absolute rounded-xl ring-2 ring-primary pointer-events-none" style={rect} />}
    <div ref={tip} tabIndex={-1} role="dialog" aria-modal="false" aria-labelledby="guide-title" aria-describedby="guide-description" className="absolute pointer-events-auto w-80 max-w-[calc(100vw-24px)] max-h-[calc(100dvh-24px)] overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-xl p-5 focus:outline-none" style={position}>
      <div className="flex items-start justify-between gap-3">
        <h2 id="guide-title" className="font-heading text-lg font-bold">{step.title}</h2>
        <button type="button" onClick={skip} aria-label="Chiudi guida" className="-mt-2 -mr-2 h-10 w-10 shrink-0 flex items-center justify-center rounded-lg hover:bg-secondary"><X size={18} /></button>
      </div>
      <p id="guide-description" className="text-sm text-muted-foreground leading-relaxed mt-2" aria-live="polite">{step.body}</p>
      <div className="flex items-center justify-between gap-2 mt-5">
        <span className="text-xs text-muted-foreground">{stepIndex + 1} di {steps.length}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" disabled={!stepIndex} onClick={prev}>Indietro</Button>
          <Button size="sm" onClick={next}>{stepIndex + 1 === steps.length ? 'Fine' : 'Avanti'}</Button>
        </div>
      </div>
    </div>
  </div>;
}

