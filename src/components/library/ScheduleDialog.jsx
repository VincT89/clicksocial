import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '@/api/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { localDateTime, toInstant } from '@/lib/editorialDates.mjs';
import { toast } from 'sonner';
import { Image } from '@/components/ui/image';
import { prepareSocialPhoto } from '@/lib/socialPhoto';
import { PLATFORMS } from '@/lib/editorialDates.mjs';
import { isNative, openExternal } from '@/lib/mobile';
import DualPublishDialog from './DualPublishDialog';
import { postChannels } from '../../../shared/publish-channels.mjs';

export default function ScheduleDialog(props) {
  return postChannels(props.post).length === 2 ? <DualPublishDialog key={props.post.id} {...props} /> : <SinglePublishDialog {...props} />;
}

function SinglePublishDialog({ post, open, onOpenChange, onScheduled }) {
  useI18n();
  const sending = useRef(false);
  const [state, setState] = useState(null);
  const [pageId, setPageId] = useState('');
  const [when, setWhen] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scheduled, setScheduled] = useState(false);
  const [caption, setCaption] = useState('');
  const [options, setOptions] = useState({ title: '', privacy_level: '', disable_comment: true, auto_add_music: false, brand_content_toggle: false, brand_organic_toggle: false, is_aigc: false, music_consent: false, commercial_disclosure: false });
  const [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState('loading');
  useEffect(() => {
    if (!open) return;
    let active = true;
    setState(null); setPageId(''); setError(''); setPreview('loading');
    setScheduled(post.status === 'in_coda');
    setCaption(post.social_job?.caption ?? [post.caption, post.hashtags].filter(Boolean).join('\n\n'));
    setOptions({ title: post.social_job?.options?.title || '', privacy_level: '', disable_comment: true, auto_add_music: false, brand_content_toggle: false, brand_organic_toggle: false, is_aigc: post.mode !== 'original', music_consent: false, commercial_disclosure: false });
    setWhen(localDateTime(post.scheduled_at || (post.editorial_at && new Date(post.editorial_at).getTime() > Date.now() ? post.editorial_at : new Date(Date.now() + 3600000))));
    api.social.prepare(post.id).then(result => {
      if (!active) return;
      setState(result);
      setPageId(result.accounts?.find(p => p.id === post.social_page_id)?.id || (result.accounts?.length === 1 ? result.accounts[0].id : ''));
    }).catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [open, post, retry]);
  const confirm = async () => {
    if (sending.current || !state?.accounts?.some(account => account.id === pageId)) return;
    if (preview !== 'ready') { setError('Attendi il caricamento della foto prima di pubblicare.'); return; }
    const date = toInstant(when);
    if (scheduled && (!date || new Date(date).getTime() <= Date.now())) { setError('Scegli una data e un’ora future valide.'); return; }
    sending.current = true; setSaving(true); setError('');
    try {
      let image_url = post.image_url;
      if (post.platform !== 'facebook') {
        const file = await prepareSocialPhoto(post.image_url, post.platform);
        image_url = (await api.integrations.Core.UploadFile({ file })).file_url;
      }
      await api.social.publish({ post_id:post.id, account_id:pageId, scheduled_at:scheduled ? date : null, image_url, caption, options, confirmed:true });
      toast.success(scheduled ? translateUI("Invio programmato. L’esito comparirà in Libreria.") : translateUI("Invio in coda. Attendi la conferma del social in Libreria."));
      await onScheduled(); onOpenChange(false);
    } catch (e) { setError(e.message); }
    finally { sending.current = false; setSaving(false); }
  };
  const ready = state?.accounts?.length > 0;
  const maximum = post.platform === 'instagram' ? 2200 : post.platform === 'tiktok' ? 4000 : 10000;
  const privacy = { PUBLIC_TO_EVERYONE:'Tutti', MUTUAL_FOLLOW_FRIENDS:'Amici', FOLLOWER_OF_CREATOR:'Follower', SELF_ONLY:'Solo io' };
  const toggle = key => e => setOptions(previous => ({ ...previous, [key]: e.target.checked }));
  const external = event => { if (isNative) { event.preventDefault(); openExternal(event.currentTarget.href).catch(e => setError(e.message)); } };
  return <Dialog open={open} onOpenChange={value => { if (!saving) onOpenChange(value); }}>
    <DialogContent className="max-h-[90dvh] overflow-y-auto min-w-0">
      <DialogHeader className="pr-6"><DialogTitle>{translateUI("Pubblica su")} {PLATFORMS[post.platform]}</DialogTitle><DialogDescription>{translateUI("Controlla immagine, descrizione e account prima di confermare. Segui l’esito nella Libreria: il social può impiegare qualche minuto.")}</DialogDescription></DialogHeader>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {!state && !error && <p role="status" className="text-sm">{translateUI("Verifica dell’account e dei permessi…")}</p>}
      {state && !ready && <div className="space-y-3"><p className="text-sm">{translateUI("Il post è salvato. Collega un account")} {PLATFORMS[post.platform]} {translateUI("per pubblicarlo.")}</p><Button asChild><Link to="/profilo?section=social">{translateUI("Collega il social")}</Link></Button></div>}
      {!state && error && <div className="flex flex-wrap gap-3"><Button variant="outline" onClick={() => setRetry(value => value + 1)}>{translateUI("Riprova")}</Button><Button asChild variant="outline"><Link to="/profilo?section=social">{translateUI("Apri collegamenti social")}</Link></Button><Link className="min-h-11 py-3 text-sm underline" to="/profilo?section=plan">{translateUI("Controlla il piano")}</Link></div>}
      {ready && <>
        <Image src={post.image_url} alt={translateUI("Foto che verrà inviata al social")} className="max-h-52 w-full object-contain bg-secondary rounded-md" onLoad={event => setPreview(event.currentTarget.dataset.errorImage ? 'error' : 'ready')} onError={() => setPreview('error')} />
        {preview === 'loading' && <p role="status" className="text-sm">{translateUI("Caricamento della foto…")}</p>}
        {preview === 'error' && <p role="alert" className="text-sm text-destructive">{translateUI("Non riesco a mostrare la foto. Chiudi questa finestra e riaprila per riprovare. La pubblicazione resta bloccata finché non puoi controllare l’immagine.")}</p>}
        <div className="space-y-2"><Label htmlFor="schedule-page">{post.platform === 'facebook' ? translateUI("Pagina Facebook") : translateUI("Account di destinazione")}</Label><AppSelect id="schedule-page" className="w-full min-w-0 border border-input rounded-md p-3 text-sm bg-background" value={pageId} onChange={e => setPageId(e.target.value)} disabled={saving}><option value="">{translateUI("Scegli dove pubblicare")}</option>{state.accounts.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</AppSelect></div>
        <div className="space-y-2"><Label htmlFor="publish-caption">{translateUI("Testo e hashtag")}</Label><textarea id="publish-caption" className="w-full min-w-0 rounded-md border border-input bg-background p-3 text-base sm:text-sm" rows={5} value={caption} onChange={e => setCaption(e.target.value)} disabled={saving} aria-describedby="publish-caption-limit" aria-invalid={caption.length > maximum} /><p id="publish-caption-limit" className={caption.length > maximum ? 'text-xs text-destructive' : 'text-xs text-muted-foreground'}>{caption.length > maximum ? translateUI("Accorcia il testo di almeno ") + (caption.length - maximum) + translateUI(" caratteri.") : caption.length + ' / ' + maximum + translateUI(" caratteri. Le modifiche qui valgono per questo invio.")}</p></div>
        {post.platform === 'tiktok' && <fieldset className="space-y-3 border border-border rounded-md p-3" disabled={saving}><legend className="px-1 text-sm font-medium">{translateUI("Opzioni TikTok")}</legend>
          <div className="space-y-2"><Label htmlFor="tiktok-title">{translateUI("Titolo della foto su TikTok")}</Label><Input id="tiktok-title" value={options.title} maxLength={90} onChange={e => setOptions(old => ({ ...old, title:e.target.value }))} /><p className="text-xs text-muted-foreground">{translateUI("Facoltativo, fino a 90 caratteri.")}</p></div>
          <div className="space-y-2"><Label htmlFor="tiktok-privacy">{translateUI("Chi può vedere il post")}</Label><AppSelect id="tiktok-privacy" className="w-full min-h-11 rounded-md border border-input bg-background p-2" value={options.privacy_level} onChange={e => setOptions(old => ({ ...old, privacy_level:e.target.value }))}><option value="">{translateUI("Scegli la visibilità")}</option>{(state.creator?.privacy_level_options || []).map(value => <option key={value} value={value} disabled={options.brand_content_toggle && value === 'SELF_ONLY'}>{privacy[value] || value}</option>)}</AppSelect></div>
          <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={!options.disable_comment} disabled={!!state.creator?.comment_disabled} onChange={e => setOptions(old => ({ ...old, disable_comment:!e.target.checked }))} />{translateUI("Consenti commenti")}{state.creator?.comment_disabled ? translateUI(" (disabilitati dall’account)") : ''}</label>
          <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.auto_add_music} onChange={toggle('auto_add_music')} />{translateUI("Consenti a TikTok di aggiungere musica")}</label>
          <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.commercial_disclosure} onChange={e => setOptions(old => ({ ...old, commercial_disclosure:e.target.checked, brand_content_toggle:false, brand_organic_toggle:false, music_consent:false }))} />{translateUI("Questo post promuove un’attività, un marchio, un prodotto o un servizio")}</label>
          {options.commercial_disclosure && <div className="space-y-2 pl-3 border-l border-border">
            <p className="text-xs text-muted-foreground">{translateUI("Seleziona almeno una voce.")}</p>
            <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.brand_organic_toggle} onChange={toggle('brand_organic_toggle')} />{translateUI("La mia attività o il mio marchio")}</label>
            <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.brand_content_toggle} disabled={options.privacy_level === 'SELF_ONLY'} onChange={e => setOptions(old => ({ ...old, brand_content_toggle:e.target.checked, music_consent:false }))} />{translateUI("Un altro marchio, in una collaborazione commerciale")}</label>
            {options.privacy_level === 'SELF_ONLY' && <p className="text-xs text-muted-foreground">{translateUI("Per una collaborazione commerciale scegli una visibilità diversa da Solo io.")}</p>}
            {(options.brand_content_toggle || options.brand_organic_toggle) && <p className="text-xs text-muted-foreground">{translateUI("La foto sarà etichettata come")} {options.brand_content_toggle ? translateUI("Partnership retribuita (Paid partnership)") : translateUI("Contenuto promozionale (Promotional content)")}.</p>}
          </div>}
          <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.is_aigc} disabled={post.mode !== 'original'} onChange={toggle('is_aigc')} />{translateUI("Immagine generata o modificata con AI")}</label>
          <label className="flex gap-3 items-start py-2 text-sm"><input type="checkbox" className="h-5 w-5 shrink-0" checked={options.music_consent} onChange={toggle('music_consent')} /><span>{translateUI("Pubblicando accetto la")} <a className="underline" href="https://www.tiktok.com/legal/page/global/music-usage-confirmation/en" target="_blank" rel="noopener noreferrer" onClick={external}>{translateUI("conferma sull’uso della musica di TikTok")}</a>{options.brand_content_toggle && <> {translateUI("e la")} <a className="underline" href="https://www.tiktok.com/legal/page/global/bc-policy/en" target="_blank" rel="noopener noreferrer" onClick={external}>{translateUI("normativa sui contenuti brandizzati")}</a></>}.</span></label>
        </fieldset>}
        <div className="setting-switch"><Label htmlFor="schedule-enabled">{translateUI("Programma per una data futura")}</Label><Switch id="schedule-enabled" checked={scheduled} onCheckedChange={setScheduled} disabled={saving} /></div>
        {scheduled && <div className="space-y-2"><Label htmlFor="schedule-when">{translateUI("Data e ora dell’invio")}</Label><Input className="min-w-0 max-w-full" id="schedule-when" type="datetime-local" value={when} onChange={e => setWhen(e.target.value)} disabled={saving} /><p className="text-xs text-muted-foreground">{translateUI("Ora locale:")} {Intl.DateTimeFormat().resolvedOptions().timeZone}{translateUI(". Ritroverai il post nel calendario.")}</p></div>}
        <p className="text-sm break-words">{pageId ? translateUI("Destinazione: ") + state.accounts.find(account => account.id === pageId)?.name + translateUI(" su ") + PLATFORMS[post.platform] + '.' : translateUI("Seleziona un account prima di confermare.")}</p>
        <DialogFooter><Button className="min-h-11 whitespace-normal" onClick={confirm} disabled={saving || preview !== 'ready' || !pageId || caption.length > maximum || post.platform === 'tiktok' && (!options.privacy_level || !options.music_consent || options.commercial_disclosure && !options.brand_content_toggle && !options.brand_organic_toggle || options.brand_content_toggle && options.privacy_level === 'SELF_ONLY')}>{saving ? translateUI("Invio della richiesta…") : scheduled ? translateUI("Conferma programmazione") : translateUI("Conferma pubblicazione")}</Button></DialogFooter>
      </>}
    </DialogContent>
  </Dialog>;
}

