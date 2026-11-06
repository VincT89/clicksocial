import { useEffect, useRef, useState } from 'react';
import { CloudUpload } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '@/api/client';
import { useI18n } from '@/lib/i18n';
import { Button } from '@/components/ui/button';
import { imageUploadError, MEDIA_IMAGE_TYPES } from '../../../shared/media.mjs';

export default function MediaUpload({ ownerId, onUploaded }) {
  const { t } = useI18n();
  const cache = useQueryClient();
  const input = useRef(null);
  const batch = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  /** Una selezione multipla non deve continuare a inviare file se si esce dalla Libreria o si cambia account. */
  useEffect(() => () => { batch.current = null; }, [ownerId]);

  const upload = async files => {
    if (!files.length || batch.current || !ownerId) return;
    const ticket = {};
    batch.current = ticket;
    setResult(null);
    const errors = [];
    let saved = 0;
    try {
      for (const [index, file] of files.entries()) {
        if (batch.current !== ticket) break;
        setProgress({ current:index + 1, total:files.length });
        const issue = imageUploadError(file);
        if (issue) { errors.push({ name:file.name, reason:issue }); continue; }
        try { await api.media.upload(file); saved++; }
        catch (error) { errors.push({ name:file.name, reason:error.message }); }
      }
    } finally {
      void cache.invalidateQueries({ queryKey:['media-library', ownerId] });
      if (batch.current === ticket) {
        batch.current = null;
        setProgress(null);
        setResult({ saved, errors });
        if (saved) onUploaded();
      }
    }
  };
  return <section className="media-upload-section" aria-labelledby="media-upload-title">
    <div className={'media-dropzone' + (dragging ? ' is-dragging' : '')}
      onDragOver={event => { if (event.dataTransfer.types.includes('Files')) { event.preventDefault(); setDragging(true); } }}
      onDragLeave={event => { if (!(event.relatedTarget instanceof Node) || !event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); void upload(Array.from(event.dataTransfer.files)); }}>
      <CloudUpload size={30} aria-hidden="true" />
      <h2 id="media-upload-title">{t('Carica file')}</h2>
      <p>{t('Trascina qui le immagini o sceglile dal dispositivo.')}</p>
      <Button type="button" disabled={!!progress} onClick={() => input.current?.click()}>{t('Seleziona file')}</Button>
      <input ref={input} hidden type="file" multiple accept={MEDIA_IMAGE_TYPES.join(',')} aria-label={t('Seleziona file')}
        onChange={event => { const files = Array.from(event.target.files || []); event.target.value = ''; void upload(files); }} />
      <small>{t('JPEG, PNG, WebP e GIF fino a 15 MB per file.')}</small>
    </div>
    <div role="status" aria-live="polite" className="media-upload-status">
      {progress ? t('Caricamento {current} di {total}…', progress) : result?.saved > 0 && t('File caricati: {count}.', { count:result.saved })}
    </div>
    {result?.errors.length > 0 && <ul role="alert" className="media-upload-errors">
      {result.errors.map(({ name, reason }, index) => <li key={index}><strong>{name}</strong>{' — '}{t(reason)}</li>)}
    </ul>}
  </section>;
}
