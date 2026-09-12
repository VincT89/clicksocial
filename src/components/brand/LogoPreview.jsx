import { useEffect, useRef, useState } from 'react';
import { prepareLogo } from '@/lib/templateRenderer';

export default function LogoPreview({ url, background = 'auto', light = false }) {
  const ref = useRef(null), [error, setError] = useState('');
  useEffect(() => {
    let active = true; setError('');
    prepareLogo({ url, background }).then(source => {
      if (!active || !ref.current) return;
      const canvas = ref.current; canvas.width = source.width; canvas.height = source.height;
      canvas.getContext('2d').drawImage(source, 0, 0);
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [url, background]);
  return <div className="space-y-2"><div className="w-24 h-20 rounded-lg border border-border p-2" style={{ backgroundColor: light ? '#202020' : '#FFFFFF' }}>
    <canvas ref={ref} role="img" aria-label="Anteprima del logo dopo la rimozione dello sfondo" className="w-full h-full object-contain" />
  </div>{error && <p role="alert" className="max-w-56 text-xs text-destructive">{error}</p>}</div>;
}
