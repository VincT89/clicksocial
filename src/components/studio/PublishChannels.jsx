import { Facebook, Instagram } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { PLATFORMS } from '@/lib/editorialDates.mjs';
import { PUBLISH_CHANNELS } from '../../../shared/publish-channels.mjs';

const icons = { instagram:Instagram, facebook:Facebook };

export default function PublishChannels({ channels, onChange, disabled, label = 'Pubblica su' }) {
  const { t } = useI18n();
  return <fieldset className="studio-destination" disabled={disabled}>
    <legend>{t(label)}</legend>
    {PUBLISH_CHANNELS.map(id => {
      const Icon = icons[id];
      return <label key={id} className={'studio-channel network-' + id}>
        <input className="sr-only" type="checkbox" role="switch" checked={channels.includes(id)}
          onChange={event => onChange(event.target.checked ? [...channels, id] : channels.filter(other => other !== id))} />
        <Icon size={19} aria-hidden="true" /><span>{PLATFORMS[id]}</span>
        <span className="studio-channel-toggle" aria-hidden="true" />
      </label>;
    })}
  </fieldset>;
}
