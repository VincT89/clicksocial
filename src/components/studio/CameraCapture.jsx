import { useEffect, useRef, useState } from 'react';
import { Camera, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { cameraError, createCameraSession } from '@/lib/camera.mjs';
import { isNative } from '@/lib/mobile';
import { captureNativePhoto } from '@/lib/nativeCamera';
import { useAuth } from '@/lib/AuthContext';

export default function CameraCapture({ open, onOpenChange, onCapture, busy, initialPhoto = null }) {
  const { user } = useAuth();
  const video = useRef(null);
  const nativeInput = useRef(null);
  const session = useRef(null);
  const active = useRef(false);
  const [facing, setFacing] = useState('environment');
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  useEffect(() => {
    active.current = open;
    if (!open) return;
    setPhoto(initialPhoto); setError(''); setStatus(initialPhoto ? 'preview' : 'idle'); setFacing('environment');
    const stop = () => { active.current = false; session.current?.stop(); };
    const hidden = () => {
      if (document.hidden) { session.current?.stop(); setStatus('idle'); }
    };
    window.addEventListener('pagehide', stop);
    document.addEventListener('visibilitychange', hidden);
    return () => { stop(); window.removeEventListener('pagehide', stop); document.removeEventListener('visibilitychange', hidden); };
  }, [open, initialPhoto]);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo.url); }, [photo]);
  const start = async (side = facing) => {
    setPhoto(null); setError(''); setStatus('opening');
    if (isNative) {
      try {
        const next = await captureNativePhoto(user.id);
        if (active.current && next) { setPhoto(next); setStatus('preview'); }
        else { if (next) URL.revokeObjectURL(next.url); setStatus('idle'); }
      } catch (error) { if (active.current) { setError(/cancel|annull/i.test(error.message) ? '' : 'Non riesco ad acquisire la foto. Controlla le autorizzazioni della fotocamera nelle impostazioni del telefono.'); setStatus('idle'); } }
      return;
    }
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('Questa modalità richiede localhost o HTTPS. Usa la fotocamera del dispositivo oppure carica una foto.'); setStatus('idle'); return;
    }
    session.current ||= createCameraSession(navigator.mediaDevices);
    try {
      const stream = await session.current.start(side);
      if (!stream || !active.current) return;
      if (!video.current) { session.current.stop(); return; }
      video.current.srcObject = stream;
      await video.current.play();
      if (active.current) { setStatus('ready'); setFacing(side); }
    } catch (e) {
      if (active.current) { session.current?.stop(); setStatus('idle'); setError(cameraError(e)); }
    }
  };
  const capture = async () => {
    try {
      const player = video.current;
      if (!player?.videoWidth || !player?.videoHeight) throw new Error('Attendi che l’anteprima sia pronta.');
      const scale = Math.min(1, 2048 / Math.max(player.videoWidth, player.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(player.videoWidth * scale); canvas.height = Math.round(player.videoHeight * scale);
      canvas.getContext('2d').drawImage(player, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
      if (!blob) throw new Error('Scatto non riuscito. Riprova.');
      if (!active.current) return;
      setPhoto({ url: URL.createObjectURL(blob), file: new File([blob], 'scatto-clicksocial.jpg', { type: 'image/jpeg' }) });
      session.current?.stop(); setStatus('preview');
    } catch (e) { setError(e.message); }
  };
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="sm:max-w-xl max-h-[90dvh] overflow-y-auto">
      <DialogHeader><DialogTitle>Scatta una foto</DialogTitle>
        <DialogDescription>Attiva la fotocamera, scatta e controlla l’anteprima. La foto viene caricata solo quando scegli Usa foto.</DialogDescription>
      </DialogHeader>
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-secondary flex items-center justify-center">
        {photo ? <img src={photo.url} alt="Anteprima dello scatto" className="w-full h-full object-contain" /> : <>
          <video ref={video} autoPlay muted playsInline aria-label="Anteprima fotocamera" className={status === 'ready' ? 'w-full h-full object-contain' : 'hidden'} />
          {status !== 'ready' && <p className="p-5 text-center text-sm text-muted-foreground" role="status">{status === 'opening' ? 'Apertura della fotocamera…' : 'La fotocamera è spenta.'}</p>}
        </>}
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap justify-center gap-2">
        {photo ? <>
          <Button variant="outline" onClick={() => start()} disabled={busy}>Rifai foto</Button>
          <Button onClick={() => onCapture(photo.file)} disabled={busy}>{busy ? 'Caricamento…' : 'Usa foto'}</Button>
        </> : status === 'ready' ? <>
          <Button variant="outline" onClick={() => start(facing === 'environment' ? 'user' : 'environment')}><RefreshCw size={16} className="mr-2" />Cambia fotocamera</Button>
          <Button onClick={capture}><Camera size={16} className="mr-2" />Scatta</Button>
        </> : <Button onClick={() => start()} disabled={status === 'opening'}>Attiva fotocamera</Button>}
      </div>
      {!photo && !isNative && <Button variant="ghost" disabled={busy} onClick={() => { session.current?.stop(); setStatus('idle'); nativeInput.current?.click(); }}>Usa la fotocamera del dispositivo</Button>}
      <input ref={nativeInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp,image/gif" capture="environment" onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; if (file) { setPhoto({ url: URL.createObjectURL(file), file }); setStatus('preview'); setError(''); } }} />
    </DialogContent>
  </Dialog>;
}

