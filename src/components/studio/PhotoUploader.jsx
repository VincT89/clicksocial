import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Camera, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { api } from '@/api/client';
import { toast } from 'sonner';
import CameraCapture from './CameraCapture';
import { isNative } from '@/lib/mobile';
import { captureNativePhoto, getRestoredPhoto, clearRestoredPhoto } from '@/lib/nativeCamera';
import { imageUploadError, MEDIA_IMAGE_TYPES } from '../../../shared/media.mjs';
import { useAuth } from '@/lib/AuthContext';

export default function PhotoUploader({ onUploaded }) {
  useI18n();
  const { user } = useAuth();
  const inputRef = useRef(null);
  const uploading = useRef(false);
  const [busy, setBusy] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [nativePhoto, setNativePhoto] = useState(null);
  const [selecting, setSelecting] = useState(false);
  useEffect(() => {
    const restore = () => {
      const photo = getRestoredPhoto();
      if (photo) { clearRestoredPhoto(); setNativePhoto(photo); setCameraOpen(true); }
    };
    restore(); window.addEventListener('clicksocial:restored-photo', restore);
    return () => window.removeEventListener('clicksocial:restored-photo', restore);
  }, []);
  const choosePhoto = async () => {
    if (!isNative) { inputRef.current?.click(); return; }
    if (selecting || busy) return;
    setSelecting(true);
    try { const photo = await captureNativePhoto(user.id, true); if (photo) { setNativePhoto(photo); setCameraOpen(true); } }
    catch (error) { if (!/cancel|annull/i.test(error.message)) toast.error(translateUI("Non riesco ad aprire la foto. Controlla le autorizzazioni nelle impostazioni del telefono.")); }
    finally { setSelecting(false); }
  };
  const changeCameraOpen = value => { setCameraOpen(value); if (!value) setNativePhoto(null); };
  const handleFile = async file => {
    if (!file || uploading.current) return;
    const issue = imageUploadError(file);
    if (issue) { toast.error(translateUI(issue)); return; }
    uploading.current = true; setBusy(true);
    try {
      const { file_url } = await api.media.upload(file);
      changeCameraOpen(false); onUploaded(file_url);
    } catch (e) { toast.error(translateUI("Caricamento non riuscito: ") + translateUI(e.message)); }
    finally { uploading.current = false; setBusy(false); }
  };
  return <>
    <div data-tour="studio-uploader" aria-busy={busy} onDragOver={e => { e.preventDefault(); setDragOver(true); }} onDragLeave={() => setDragOver(false)} onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files?.[0]); }}
      className={`rounded-3xl border-2 border-dashed flex flex-col items-center justify-center text-center px-5 py-12 sm:py-16 ${dragOver ? 'border-primary bg-accent' : 'border-border bg-card'}`}>
      <h2 className="font-heading text-xl">{translateUI("Da quale foto partiamo?")}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm">{translateUI("Trascina un’immagine, sceglila dal dispositivo oppure scatta una foto.")}</p>
      <div className="flex flex-wrap justify-center gap-3 mt-6">
        <Button type="button" variant="outline" onClick={choosePhoto} disabled={busy || selecting}><UploadCloud size={16} className="mr-2" />{busy ? translateUI("Caricamento…") : selecting ? translateUI("Apertura foto…") : translateUI("Scegli foto")}</Button>
        <Button type="button" onClick={() => setCameraOpen(true)} disabled={busy || selecting}><Camera size={16} className="mr-2" />{translateUI("Scatta foto")}</Button>
      </div>
      <p className="text-xs text-muted-foreground mt-5">{translateUI("JPEG, PNG, WebP o GIF · massimo 15 MB")}</p>
      <input ref={inputRef} type="file" accept={MEDIA_IMAGE_TYPES.join(',')} className="hidden" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; handleFile(file); }} />
    </div>
    <CameraCapture open={cameraOpen} onOpenChange={changeCameraOpen} onCapture={handleFile} busy={busy} initialPhoto={nativePhoto} />
  </>;
}

