import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ConfirmAction from '@/components/ConfirmAction';

export default function SocialConnections() {
  const { appPublicSettings } = useAuth();
  const enabled = !!appPublicSettings?.public_settings?.facebookEnabled;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const load = async () => {
    setError('');
    try { setStatus((await api.functions.invoke('socialStatus')).data.facebook); }
    catch (e) { setError(e.message); }
  };
  useEffect(() => { load(); }, []);
  const connect = async () => {
    setBusy(true);
    try { window.location.assign(await api.social.connect()); }
    catch (e) { toast.error(e.message); setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true);
    try { await api.social.disconnect(); setStatus({connected:false,pages:[]}); setConfirm(false); toast.success('Pagina Facebook scollegata'); }
    catch (e) { toast.error(e.message); }
    finally { setBusy(false); }
  };
  return <>
    {error ? <div role="alert" className="space-y-3 text-sm"><p>Connessione non verificabile: {error}</p><Button variant="outline" onClick={load}>Riprova</Button></div> : !status ? <p role="status" className="text-sm text-muted-foreground">Verifica delle connessioni…</p> :
      <div className="rounded-xl border border-border p-4 space-y-3">
        <div><h3 className="text-sm font-medium">Pagina Facebook</h3><p className="text-sm text-muted-foreground mt-1 break-words">{status.connected ? (status.pages.map(p => p.name).join(', ') || 'Collegata, nessuna Pagina disponibile') : enabled ? 'Non collegata' : 'Da configurare'}</p></div>
        {status.connected ? <Button variant="outline" disabled={busy} onClick={() => setConfirm(true)}>Scollega Facebook</Button> : <Button data-tour="social-connect" onClick={connect} disabled={busy || !enabled}>{busy ? 'Apertura di Meta…' : 'Collega Facebook'}</Button>}
        {enabled && !status.connected && <p className="text-xs text-muted-foreground">Il collegamento apre Meta nella stessa scheda. Salva prima eventuali bozze o modifiche al profilo.</p>}
      </div>}
    <ConfirmAction open={confirm} onOpenChange={setConfirm} title="Scollegare Facebook?" description="Gli invii automatici ancora in coda verranno annullati. Foto, testi e date del piano editoriale restano salvati." confirmLabel="Scollega Facebook" onConfirm={disconnect} busy={busy} />
  </>;
}

