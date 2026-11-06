import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { api } from '@/api/client';
import { useI18n } from '@/lib/i18n';
import { localDateTime, toInstant, PLATFORMS } from '@/lib/editorialDates.mjs';
import { prepareSocialPhoto } from '@/lib/socialPhoto';
import { PUBLISH_CHANNELS } from '../../../shared/publish-channels.mjs';
import AppSelect from '@/components/AppSelect';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';

export default function DualPublishDialog({ post, open, onOpenChange, onScheduled }) {
  const { t } = useI18n();
  const [accounts, setAccounts] = useState(null);
  const [selected, setSelected] = useState({});
  const [caption, setCaption] = useState([post.caption, post.hashtags].filter(Boolean).join('\n\n'));
  const [scheduled, setScheduled] = useState(false);
  const [when, setWhen] = useState(() => localDateTime(post.editorial_at && new Date(post.editorial_at) > new Date() ? post.editorial_at : new Date(Date.now() + 3600000)));
  const [preview, setPreview] = useState('loading');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const sending = useRef(false), instagramImage = useRef(null), requestId = useRef(null);
  useEffect(() => {
    if (!open) return;
    let active = true;
    setAccounts(null); setSelected({}); setError('');
    Promise.all(PUBLISH_CHANNELS.map(async platform => {
      try { const { accounts } = await api.social.prepare(post.id, platform); return [platform, { accounts }]; }
      catch (e) { return [platform, { accounts:[], error:e.message }]; }
    })).then(rows => {
      if (!active) return;
      const results = Object.fromEntries(rows);
      setAccounts(results);
      setSelected(Object.fromEntries(PUBLISH_CHANNELS.map(p => [p, results[p].accounts.length === 1 ? results[p].accounts[0].id : ''])));
    });
    return () => { active = false; };
  }, [open, post.id, retry]);
  const ready = accounts && PUBLISH_CHANNELS.every(p => accounts[p].accounts.some(account => account.id === selected[p]));
  const confirm = async () => {
    if (sending.current || !ready || preview !== 'ready' || caption.length > 2200) return;
    const date = scheduled ? toInstant(when) : null;
    if (scheduled && (!date || new Date(date).getTime() <= Date.now())) { setError('Scegli una data e un’ora future valide.'); return; }
    sending.current = true; setBusy(true); setError('');
    try {
      if (!instagramImage.current) {
        const file = await prepareSocialPhoto(post.image_url, 'instagram');
        instagramImage.current = (await api.integrations.Core.UploadFile({ file })).file_url;
      }
      requestId.current ||= crypto.randomUUID();
      await api.social.publish({ post_id:post.id, request_id:requestId.current, confirmed:true, caption, scheduled_at:date,
        destinations:PUBLISH_CHANNELS.map(platform => ({ platform, account_id:selected[platform], image_url:platform === 'instagram' ? instagramImage.current : post.image_url })) });
      toast.success(t('Controlla i due invii nei post salvati.'));
      await onScheduled(); onOpenChange(false);
    } catch (e) { setError(e.message); }
    finally { sending.current = false; setBusy(false); }
  };
  return <Dialog open={open} onOpenChange={value => { if (!sending.current) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto min-w-0" closeLabel={t('Chiudi')}>
      <DialogHeader className="pr-6"><DialogTitle>{t('Pubblica su')} {t('Instagram e Facebook')}</DialogTitle>
        <DialogDescription>{t('Conferma entrambe le destinazioni. Nei post salvati potrai seguire ogni invio separatamente.')}</DialogDescription></DialogHeader>
      <Image src={post.image_url} alt={t('Foto che verrà inviata al social')} className="w-full max-h-44 object-contain rounded-md bg-secondary"
        onLoad={() => setPreview('ready')} onError={() => setPreview('error')} unavailable={<p role="alert">{t('Immagine non disponibile')}</p>} />
      {!accounts && <p role="status">{t('Verifica dell’account e dei permessi…')}</p>}
      {accounts && PUBLISH_CHANNELS.map(platform => <div key={platform} className="space-y-1 min-w-0">
        <label className="text-sm font-medium" htmlFor={'publish-' + platform}>{t(platform === 'instagram' ? 'Account Instagram' : 'Pagina Facebook')}</label>
        {accounts[platform].accounts.length ? <AppSelect id={'publish-' + platform} className="w-full" disabled={busy} value={selected[platform] || ''} onChange={e => setSelected(current => ({ ...current, [platform]:e.target.value }))}>
          <option value="">{t('Scegli dove pubblicare')}</option>{accounts[platform].accounts.map(account => <option key={account.id} value={account.id}>{account.name}</option>)}
        </AppSelect> : <div className="text-sm"><p>{accounts[platform].error ? t(accounts[platform].error) : t('Collega un account per pubblicare su {platform}.', { platform:PLATFORMS[platform] })}</p>
          <Link className="underline inline-flex items-center min-h-11" to="/profilo?section=social">{t('Apri collegamenti social')}</Link></div>}
      </div>)}
      {accounts && PUBLISH_CHANNELS.some(p => !accounts[p].accounts.length) && <Button variant="outline" onClick={() => setRetry(v => v + 1)}>{t('Riprova')}</Button>}
      <label htmlFor="dual-caption" className="text-sm font-medium">{t('Testo e hashtag')}</label>
      <textarea id="dual-caption" rows={3} className="rounded-md border p-2 w-full" value={caption} disabled={busy} onChange={e => setCaption(e.target.value)} aria-invalid={caption.length > 2200} aria-describedby="dual-caption-limit" />
      <small id="dual-caption-limit">{caption.length} / 2200</small>
      <div className="setting-switch"><label htmlFor="dual-scheduled">{t('Programma per una data futura')}</label><Switch id="dual-scheduled" checked={scheduled} onCheckedChange={setScheduled} disabled={busy} /></div>
      {scheduled && <><label htmlFor="dual-when">{t('Data e ora dell’invio')}</label><Input id="dual-when" type="datetime-local" value={when} disabled={busy} onChange={e => setWhen(e.target.value)} /></>}
      {error && <p role="alert" className="text-destructive text-sm">{t(error)}</p>}
      <DialogFooter><Button disabled={busy || !ready || preview !== 'ready' || caption.length > 2200} onClick={confirm}>{busy ? t('Invio della richiesta…') : t(scheduled ? 'Conferma programmazione' : 'Conferma pubblicazione')}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}
