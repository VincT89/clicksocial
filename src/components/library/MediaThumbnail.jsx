import { useEffect, useRef, useState } from 'react';
import { Check, ImageOff } from 'lucide-react';
import { useI18n } from '@/lib/i18n';
import { Image } from '@/components/ui/image';

export function MissingMedia() {
  const { t } = useI18n();
  return <span className="media-unavailable" role="img" aria-label={t('Immagine non disponibile')}><ImageOff size={21} aria-hidden="true" /></span>;
}

export default function MediaThumbnail({ item, list, selected, onOpen }) {
  const { t } = useI18n();
  const target = useRef(null);
  const [near, setNear] = useState(false);
  useEffect(() => {
    if (!window.IntersectionObserver) { setNear(true); return; }
    /** Su app nativa anche il recupero dell’immagine privata deve attendere che la miniatura sia vicina allo schermo. */
    const observer = new IntersectionObserver(([entry]) => setNear(entry.isIntersecting), { rootMargin:'300px' });
    observer.observe(target.current);
    return () => observer.disconnect();
  }, []);
  return <button ref={target} type="button" className={'media-tile' + (selected ? ' is-selected' : '')}
    aria-label={t('Apri {name}', { name:item.name })} onClick={() => onOpen(item, target.current)}>
    <span className="media-square">
      {near && <Image src={item.file_url} alt="" loading="lazy" decoding="async" unavailable={<MissingMedia />} />}
      {selected && <span className="media-selected"><Check size={14} aria-hidden="true" /></span>}
    </span>
    {list && <span className="media-file-details"><strong>{item.name}</strong><small>{t(item.kind === 'graphic' ? 'Grafica' : 'Foto')}</small></span>}
  </button>;
}
