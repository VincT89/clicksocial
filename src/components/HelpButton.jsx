import { useTour } from '@/lib/TourContext';
import { CircleHelp } from 'lucide-react';
import IconHint from '@/components/IconHint';
import { Button } from '@/components/ui/button';
export default function HelpButton({ withLabel = false }) {
  const { startTour } = useTour();
  if (withLabel) return <Button type="button" variant="ghost" onClick={startTour} className="h-11 gap-1.5 px-2 sm:px-3 text-sm"><CircleHelp size={17} aria-hidden="true" />Guida</Button>;
  return <IconHint label="Guida"><button type="button" aria-label="Guida" onClick={startTour} className="nav-icon"><CircleHelp size={20} aria-hidden="true" /></button></IconHint>;
}

