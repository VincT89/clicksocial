export function cameraError(error) {
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') return 'Accesso alla fotocamera negato. Abilitalo nelle autorizzazioni del browser oppure scegli una foto.';
  if (error?.name === 'NotFoundError' || error?.name === 'OverconstrainedError') return 'Nessuna fotocamera disponibile su questo dispositivo.';
  if (error?.name === 'NotReadableError') return 'La fotocamera è occupata o non accessibile. Chiudi le altre app che la usano e riprova.';
  return 'Non riesco ad aprire la fotocamera. Puoi riprovare o scegliere una foto dal dispositivo.';
}
export function createCameraSession(mediaDevices) {
  let revision = 0;
  let stream = null;
  const stop = () => { revision++; stream?.getTracks().forEach(track => track.stop()); stream = null; };
  return {
    stop,
    async start(facingMode = 'environment') {
      stop();
      const requestRevision = revision;
      const next = await mediaDevices.getUserMedia({ video: { facingMode: { ideal: facingMode }, width: { ideal: 1920 }, height: { ideal: 1920 } }, audio: false });
      if (requestRevision !== revision) { next.getTracks().forEach(track => track.stop()); return null; }
      stream = next;
      return stream;
    },
  };
}

