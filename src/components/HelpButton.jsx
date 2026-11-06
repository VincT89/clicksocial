import { useI18n } from '@/lib/i18n';
import { useTour } from '@/lib/TourContext';
import { CircleHelp } from 'lucide-react';
import IconHint from '@/components/IconHint';
export default function HelpButton({ withLabel = false }) {
  const { startTour } = useTour();
  const { t } = useI18n();
  if (withLabel) return <button type="button" onClick={startTour} className="nav-icon nav-labeled"><CircleHelp size={20} aria-hidden="true" /><span>{t('Guida')}</span></button>;
  return <IconHint label={t('Guida')}><button type="button" aria-label={t('Guida')} onClick={startTour} className="nav-icon"><CircleHelp size={20} aria-hidden="true" /></button></IconHint>;
}

