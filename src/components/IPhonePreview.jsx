import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { RotateCw, Smartphone, X, Wifi, Signal, BatteryFull } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { useStudioState } from '@/lib/StudioStateContext';
import { queryClientInstance } from '@/lib/query-client';
import { useI18n } from '@/lib/i18n';
import { isNative } from '@/lib/mobile';
import { isIPhonePreview, previewMessage, sendPreviewMessage } from '@/lib/iphonePreview';
import '@/components/IPhonePreview.css';

const SCREEN_WIDTH = 393;
const SCREEN_HEIGHT = 852;
const DEVICE_PADDING = 12;

export default function IPhonePreview() {
  const { isAuthenticated } = useAuth();
  return isAuthenticated && !isNative && !isIPhonePreview() ? <PreviewControl /> : null;
}
function PreviewControl() {
  const { t } = useI18n();
  const { user, checkAppState } = useAuth();
  const studio = useStudioState();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState('');
  const [busy, setBusy] = useState(false);
  const [closing, setClosing] = useState(false);
  const [scale, setScale] = useState(1);
  const [landscape, setLandscape] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [stageElement, setStageElement] = useState(null);
  const frame = useRef(null), current = useRef(null), closeTimer = useRef(null);
  const host = useRef(null);
  const deviceWidth = (landscape ? SCREEN_HEIGHT : SCREEN_WIDTH) + DEVICE_PADDING * 2;
  const deviceHeight = (landscape ? SCREEN_WIDTH : SCREEN_HEIGHT) + DEVICE_PADDING * 2;
  host.current = { user, studio, checkAppState };
  const finish = async state => {
    clearTimeout(closeTimer.current);
    if (state?.generating) { setBusy(true); setClosing(false); return; }
    if (state?.userId === host.current.user?.id && state?.draft) host.current.studio.applyPreviewDraft(state.draft);
    setOpen(false); setClosing(false);
    await host.current.checkAppState({ silent: true });
    await queryClientInstance.invalidateQueries();
  };
  useEffect(() => {
    if (!open) return;
    const receive = event => {
      if (!previewMessage(event, frame.current?.contentWindow)) return;
      if (event.data.type === 'ready') {
        sendPreviewMessage(frame.current.contentWindow, 'restore', current.current);
        setLoaded(true);
      }
      if (['state', 'close-state'].includes(event.data.type)) {
        current.current = event.data;
        setBusy(Boolean(event.data.generating));
        if (event.data.type === 'close-state') void finish(event.data);
      }
    };
    window.addEventListener('message', receive);
    return () => { window.removeEventListener('message', receive); clearTimeout(closeTimer.current); };
  }, [open]);
  useLayoutEffect(() => {
    const element = stageElement;
    if (!open || !element) return;
    const measure = () => setScale(Math.max(.05, Math.min(1, (element.clientWidth - 28) / deviceWidth, (element.clientHeight - 28) / deviceHeight)));
    const observer = new ResizeObserver(measure); observer.observe(element); measure();
    return () => observer.disconnect();
  }, [open, stageElement, deviceWidth, deviceHeight]);
  const changeOpen = next => {
    if (next) {
      if (studio.generating) return;
      current.current = { userId: user?.id, draft: studio.previewDraft, generating: false };
      setSource(location.pathname + location.search + location.hash);
      setLandscape(false); setLoaded(false); setBusy(false); setClosing(false); setOpen(true);
    } else if (!busy && !closing) {
      setClosing(true);
      sendPreviewMessage(frame.current?.contentWindow, 'request-close');
      /** Dopo un’uscita dall’account il form di accesso non contiene lo Studio: il contenitore resta chiudibile. */
      closeTimer.current = setTimeout(() => { void finish(current.current); }, 700);
    }
  };
  return <Dialog.Root open={open} onOpenChange={changeOpen}>
    <Dialog.Trigger asChild><button type="button" className="cs-preview-preview-trigger" disabled={studio.generating}><Smartphone size={19} aria-hidden="true" /><span>{t('Anteprima iPhone')}</span></button></Dialog.Trigger>
    <Dialog.Portal><Dialog.Overlay className="cs-preview-preview-overlay" /><Dialog.Content className="cs-preview-preview-dialog" onPointerDownOutside={event => event.preventDefault()} onEscapeKeyDown={event => { if (busy || closing) event.preventDefault(); }}>
      <div className="cs-preview-preview-heading">
        <div><Dialog.Title>{t('Anteprima iPhone')}</Dialog.Title><Dialog.Description>{t('Naviga nella tua app. Le modifiche restano nel tuo account.')}</Dialog.Description></div>
        <div className="cs-preview-toolbar-actions">
          <button type="button" className="cs-preview-rotate" onClick={() => setLandscape(value => !value)} disabled={closing}
            aria-label={t(landscape ? 'Ruota iPhone in verticale' : 'Ruota iPhone in orizzontale')}>
            <RotateCw size={19} aria-hidden="true" /><span>{t('Ruota iPhone')}</span>
          </button>
          <Dialog.Close className="cs-preview-preview-close" disabled={busy || closing}><X size={20} aria-hidden="true" /><span>{t('Chiudi')}</span></Dialog.Close>
        </div>
      </div>
      <div className="cs-preview-preview-stage" ref={setStageElement}>
        <div className="cs-preview-preview-size" style={{ width:deviceWidth * scale, height:deviceHeight * scale }}>
          <div className={'cs-preview-device' + (landscape ? ' is-landscape' : '')}
            style={{ width:deviceWidth, height:deviceHeight, padding:DEVICE_PADDING, transform:'scale(' + scale + ')' }}>
            <i className="cs-preview-side-key cs-preview-key-silent" /><i className="cs-preview-side-key cs-preview-key-volume" /><i className="cs-preview-side-key cs-preview-key-power" />
            <div className="cs-preview-screen">
              <iframe ref={frame} src={source} title={t('ClickSocial su iPhone')} data-clicksocial-preview="iphone" allow="camera; clipboard-write" />
              <div className="cs-preview-status" aria-hidden="true"><span>9:41</span><span className="cs-preview-status-icons"><Signal size={17} /><Wifi size={18} /><BatteryFull size={24} /></span></div>
              <div className="cs-preview-island" aria-hidden="true"><i /></div><div className="cs-preview-home-indicator" aria-hidden="true" />
            </div>
          </div>
        </div>
        {!loaded && <p className="cs-preview-preview-loading" role="status">{t('Caricamento dell’anteprima…')}</p>}
      </div>
      {busy && <p className="cs-preview-preview-note" role="status">{t('Attendi la fine della generazione prima di chiudere.')}</p>}
    </Dialog.Content></Dialog.Portal>
  </Dialog.Root>;
}
