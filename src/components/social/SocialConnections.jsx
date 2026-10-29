import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { api } from '@/api/client';
import { apiOrigin, isNative, openExternal } from '@/lib/mobile';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import ConfirmAction from '@/components/ConfirmAction';

const names = { facebook: 'Facebook', instagram: 'Instagram', tiktok: 'TikTok' };
const help = { facebook: 'Collega le Pagine che gestisci. I profili personali non sono supportati.', instagram: 'Serve un account professionale Business o Creator. L’accesso avviene su Instagram.', tiktok: 'Autorizza il profilo e la pubblicazione delle foto. Le opzioni dipendono dai permessi del tuo account.' };
const labels = { ready: 'Collegamento verificato', saved: 'Da verificare', reconnect: 'Da ricollegare', permissions: 'Permessi da aggiornare', unavailable: 'Verifica non disponibile', disconnected: 'Non collegato' };
export default function SocialConnections({ active = true }) {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const storageKey = 'clicksocial.social.' + apiOrigin + '.' + user?.id;
  const [status, setStatus] = useState(null);
  const [error, setError] = useState('');
  const [statusError, setStatusError] = useState('');
  const [pollError, setPollError] = useState('');
  const [launchError, setLaunchError] = useState('');
  const [busy, setBusy] = useState(false);
  const [disconnecting, setDisconnecting] = useState('');
  const [flowId, setFlowId] = useState('');
  const [flow, setFlow] = useState(null);
  const [selected, setSelected] = useState([]);
  const [reopen, setReopen] = useState('');
  const currentFlow = useRef('');
  const statusRequest = useRef(0);
  const load = useCallback(async () => {
    const request = ++statusRequest.current;
    setStatusError('');
    try { const result = await api.social.status(); if (request === statusRequest.current) setStatus(result); }
    catch (e) { if (request === statusRequest.current) setStatusError(e.message); }
  }, []);
  const clearFlow = useCallback(id => {
    if (currentFlow.current !== id) return false;
    currentFlow.current = '';
    setFlowId(''); setFlow(null); setSelected([]); setReopen(''); setError(''); setPollError(''); setLaunchError('');
    try { if (sessionStorage.getItem(storageKey) === id) sessionStorage.removeItem(storageKey); } catch { /* Memoria del browser non disponibile. */ }
    setParams(current => { const next = new URLSearchParams(current); if (next.get('social_flow') === id) next.delete('social_flow'); return next; }, { replace: true });
    return true;
  }, [storageKey, setParams]);
  const finishFlow = useCallback(async (id, stage) => {
    if (!clearFlow(id)) return;
    if (stage === 'completed') toast.success('Account social collegato');
    else toast.info('Collegamento annullato. Gli account già collegati restano invariati.');
    await load();
  }, [clearFlow, load]);
  const expireFlow = useCallback(async id => {
    if (!clearFlow(id)) return;
    setError('Questo tentativo è scaduto o è già stato chiuso. Controlla lo stato qui sotto; per riprovare premi Collega o Ricollega.');
    await load();
  }, [clearFlow, load]);
  const recoverClosedFlow = async (id, originalError) => {
    try {
      const result = await api.social.flow(id);
      if (currentFlow.current !== id) return;
      if (['completed', 'cancelled'].includes(result.stage)) await finishFlow(id, result.stage);
      else setError(originalError.message);
    } catch (e) {
      if (currentFlow.current !== id) return;
      if ([404, 410].includes(e.status)) await expireFlow(id);
      else setError(e.message);
    }
  };
  useEffect(() => () => { currentFlow.current = ''; statusRequest.current++; }, []);
  useEffect(() => { if (active) load(); }, [active, load]);
  useEffect(() => {
    let stored = '';
    try { stored = sessionStorage.getItem(storageKey) || ''; } catch { /* Il ritorno con link resta disponibile. */ }
    const id = params.get('social_flow') || stored;
    if (/^[a-f0-9]{64}$/.test(id) && currentFlow.current !== id) {
      currentFlow.current = id;
      setFlowId(id); setFlow(null); setSelected([]); setError(''); setPollError(''); setLaunchError(''); setReopen('');
    }
  }, [params, storageKey]);
  useEffect(() => {
    if (!flowId || !active || busy) return;
    let live = true, polling = false, terminal = false;
    const poll = async () => {
      if (polling || terminal || document.hidden) return;
      polling = true;
      try {
        const result = await api.social.flow(flowId);
        if (!live || currentFlow.current !== flowId) return;
        if (['completed', 'cancelled'].includes(result.stage)) { terminal = true; await finishFlow(flowId, result.stage); }
        else {
          setFlow(result); setPollError('');
          if (result.stage !== 'start') { setReopen(''); setLaunchError(''); }
          if (result.stage === 'error') terminal = true;
        }
      } catch (e) {
        if (!live || currentFlow.current !== flowId) return;
        if ([404, 410].includes(e.status)) { terminal = true; await expireFlow(flowId); }
        else setPollError(e.message);
      }
      finally { polling = false; }
    };
    poll();
    const timer = setInterval(poll, 5000);
    document.addEventListener('visibilitychange', poll);
    window.addEventListener('focus', poll);
    return () => { live = false; clearInterval(timer); document.removeEventListener('visibilitychange', poll); window.removeEventListener('focus', poll); };
  }, [flowId, active, busy, finishFlow, expireFlow]);
  const connect = async provider => {
    if (busy || flowId) return;
    const popup = !isNative ? window.open('about:blank', '_blank') : null;
    if (popup) popup.opener = null;
    setBusy(true); setError(''); setLaunchError('');
    try {
      const result = await api.social.connect(provider);
      currentFlow.current = result.id;
      setFlowId(result.id); setFlow({ stage: 'start', provider }); setSelected([]);
      try { sessionStorage.setItem(storageKey, result.id); } catch { /* Il link di ritorno identifica il tentativo. */ }
      if (isNative) {
        try { await openExternal(result.url); }
        catch { setReopen(result.url); setLaunchError('Non riesco ad aprire il social. Premi Apri autorizzazione per riprovare.'); }
      }
      else if (popup) popup.location.href = result.url;
      else { setReopen(result.url); setLaunchError('Il browser ha bloccato la finestra. Usa Apri autorizzazione qui sotto.'); }
    } catch (e) { popup?.close(); setError(e.message); }
    finally { setBusy(false); }
  };
  const confirm = async () => {
    const id = currentFlow.current;
    if (busy || !id || !selected.length) return;
    setBusy(true); setError('');
    try { await api.social.confirm(id, selected); await finishFlow(id, 'completed'); }
    catch (e) { if (currentFlow.current === id) { if ([404, 410].includes(e.status)) await recoverClosedFlow(id, e); else setError(e.message); } }
    finally { setBusy(false); }
  };
  const cancel = async () => {
    const id = currentFlow.current;
    if (busy || !id) return;
    setBusy(true); setError('');
    try { const result = await api.social.cancel(id); await finishFlow(id, result.stage || 'cancelled'); }
    catch (e) { if (currentFlow.current === id) { if ([404, 410].includes(e.status)) await recoverClosedFlow(id, e); else setError(e.message); } }
    finally { setBusy(false); }
  };
  const disconnect = async () => {
    setBusy(true); setError('');
    try { await api.social.disconnect(disconnecting); setDisconnecting(''); await load(); toast.success('Social scollegato'); }
    catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };
  const visibleError = error || pollError || statusError;
  return <div className="space-y-4 min-w-0">
    <p className="text-sm text-muted-foreground">Premi Collega, autorizza sul sito ufficiale e torna qui per confermare l’account. ClickSocial non ti chiede la password del social.</p>
    {visibleError && <p role="alert" className="text-sm text-destructive break-words">{visibleError}</p>}
    {flowId && <div className="rounded-lg border border-border p-4 space-y-3" aria-live="polite">
      <h3 className="font-medium">Collegamento {names[flow?.provider] || 'social'}</h3>
      {flow?.stage === 'choose' ? <>
        <p className="text-sm">Seleziona gli account da usare in ClickSocial. Controlla che siano quelli della tua attività.</p>
        <div className="space-y-2">{flow.accounts.map(account => <label key={account.id} className="flex items-center gap-3 min-h-11 break-words"><input type="checkbox" className="h-5 w-5 shrink-0" checked={selected.includes(account.id)} onChange={e => setSelected(old => e.target.checked ? [...old, account.id] : old.filter(id => id !== account.id))} disabled={busy} /><span className="min-w-0 break-words">{account.name}</span></label>)}</div>
        <Button className="min-h-11 w-full sm:w-auto" disabled={busy || !selected.length} onClick={confirm}>{busy ? 'Conferma…' : 'Conferma account selezionati'}</Button>
      </> : <p className="text-sm">{flow?.stage === 'error' ? flow.message : 'Completa l’autorizzazione nella finestra del social, poi torna qui. Il collegamento scade dopo 15 minuti.'}</p>}
      {launchError && <p role="alert" className="text-sm text-destructive break-words">{launchError}</p>}
      {reopen && (isNative ? <Button variant="outline" className="min-h-11" onClick={() => openExternal(reopen).catch(() => setLaunchError('Non riesco ad aprire il social. Riprova oppure annulla il collegamento.'))}>Apri autorizzazione</Button> : <a href={reopen} target="_blank" rel="noopener noreferrer" className="block min-h-11 py-3 text-purple underline">Apri autorizzazione</a>)}
      <Button variant="outline" className="min-h-11 w-full sm:w-auto sm:ml-2" disabled={busy} onClick={cancel}>{flow?.stage === 'error' ? 'Chiudi e riprova' : 'Annulla collegamento'}</Button>
    </div>}
    {!status && !statusError && <p role="status" className="text-sm">Verifica dei collegamenti…</p>}
    {Object.entries(names).map(([provider, name]) => {
      const item = status?.[provider];
      if (!item) return null;
      return <div key={provider} className="rounded-xl border border-border p-4 space-y-3 min-w-0">
        <h3 className="font-medium">{name}</h3>
        <p className="text-sm">{item.configured ? labels[item.state] : 'Attivazione a cura del gestore'}</p>
        {!!item.accounts.length && <p className="text-sm break-words">{item.accounts.map(account => account.name).join(', ')}</p>}
        <p className="text-sm text-muted-foreground break-words">{item.message || help[provider]}</p>
        {!item.configured && <p className="text-sm text-muted-foreground">Il gestore deve configurare l’app della società per {name}. Non devi creare un’app sviluppatore o inserire chiavi.</p>}
        <div className="flex flex-wrap gap-2">
          <Button data-tour={provider === 'facebook' ? 'social-connect' : undefined} className="min-h-11 whitespace-normal" disabled={busy || !!flowId || !item.configured} onClick={() => connect(provider)}>{item.connected ? 'Ricollega ' + name : 'Collega ' + name}</Button>
          {item.connected && <Button variant="outline" className="min-h-11" disabled={busy || !!flowId} onClick={() => setDisconnecting(provider)}>Scollega</Button>}
        </div>
      </div>;
    })}
    <Button variant="outline" className="min-h-11" disabled={busy} onClick={load}>Verifica collegamenti</Button>
    <ConfirmAction open={!!disconnecting} onOpenChange={open => { if (!open) setDisconnecting(''); }} title={'Scollegare ' + (names[disconnecting] || 'il social') + '?'} description="Gli invii ancora in coda per questo social verranno annullati. Foto, testi, date editoriali e gli altri collegamenti restano salvati. Per revocare anche l’autorizzazione al fornitore usa le impostazioni del social." confirmLabel="Scollega" onConfirm={disconnect} busy={busy} />
  </div>;
}

