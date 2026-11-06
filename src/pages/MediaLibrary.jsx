import { useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { ChevronLeft, ChevronRight, Grid2X2, List } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '@/api/client';
import { useAuth } from '@/lib/AuthContext';
import { useI18n } from '@/lib/i18n';
import { useStudioState } from '@/lib/StudioStateContext';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import ConfirmAction from '@/components/ConfirmAction';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Image } from '@/components/ui/image';
import MediaUpload from '@/components/library/MediaUpload';
import MediaThumbnail, { MissingMedia } from '@/components/library/MediaThumbnail';
import { PRIVATE_FILE } from '../../shared/brand.mjs';
import { newPostDesign } from '../../shared/templates.mjs';
import '@/components/library/MediaLibrary.css';

const filters = [['all', 'Tutti'], ['photo', 'Foto'], ['graphic', 'Grafica']];
const views = [{ list:false, Icon:Grid2X2, label:'Griglia' }, { list:true, Icon:List, label:'Elenco' }];

function AccountMedia({ user }) {
  const { t } = useI18n();
  const navigate = useNavigate();
  const studio = useStudioState();
  const [kind, setKind] = useState('all');
  const [list, setList] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [preview, setPreview] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const trigger = useRef(null);
  const gallery = useInfiniteQuery({
    queryKey:['media-library', user.id, kind], initialPageParam:null, retry:false, refetchOnMount:'always', refetchOnWindowFocus:true,
    queryFn:({ pageParam }) => api.media.list(kind, pageParam), getNextPageParam:page => page.nextCursor ?? undefined,
  });
  const items = gallery.data?.pages.flatMap(page => page.items) || [];
  const index = items.findIndex(item => item.id === selectedId);
  const selected = items[index];
  const total = gallery.data?.pages[0]?.total;
  const selectKind = value => { setKind(value); setSelectedId(null); };
  const openItem = (item, button) => { trigger.current = button; setSelectedId(item.id); setPreview(true); };
  const createPost = () => {
    if (!selected || studio.generating || !PRIVATE_FILE.test(selected.file_url)) return;
    studio.resetDraft();
    studio.setOriginalUrl(selected.file_url);
    studio.setDesign(newPostDesign(user));
    navigate('/studio');
  };
  const requestPost = () => {
    if (studio.originalUrl || studio.editingId || studio.planning || studio.title || studio.context || studio.copy || studio.design) {
      setPreview(false); setConfirm(true);
    } else createPost();
  };
  return <>
    <WorkspaceHeader subtitle="Libreria media" backToHome />
    <main className="workspace-main media-library-main">
      <div className="media-toolbar">
        <div className="media-filters" role="group" aria-label={t('Tipo di media')}>
          {filters.map(([value, label]) => <button key={value} type="button" aria-pressed={kind === value} onClick={() => selectKind(value)}>{t(label)}</button>)}
        </div>
        <Button asChild variant="outline" size="sm" className="media-archive-button"><Link to="/library">{t('Post salvati')}</Link></Button>
      </div>
      <MediaUpload ownerId={user.id} onUploaded={() => { if (kind === 'graphic') selectKind('all'); }} />
      <section className="media-collection" aria-labelledby="media-collection-title">
        <div className="media-collection-heading">
          <h2 id="media-collection-title">{t('I tuoi media')}{total != null && <span> ({total})</span>}</h2>
          <div className="media-view-switch" role="group" aria-label={t('Visualizzazione')}>
            {views.map(({ list:value, Icon, label }) =>
              <button key={label} type="button" aria-label={t(label)} title={t(label)} aria-pressed={list === value} onClick={() => setList(value)}><Icon size={18} aria-hidden="true" /></button>)}
          </div>
        </div>
        {gallery.isPending && <p role="status" className="media-notice">{t('Caricamento dei contenuti…')}</p>}
        {gallery.isError && <div role="alert" className="media-notice"><p>{t('Impossibile caricare i media.')}</p>
          <Button variant="outline" onClick={() => gallery.isFetchNextPageError ? gallery.fetchNextPage() : gallery.refetch()}>{t('Riprova')}</Button></div>}
        {total === 0 && <p className="media-notice">{t(kind === 'graphic' ? 'Le grafiche dei post salvati appariranno qui.' : 'Carica una foto per ritrovarla qui.')}</p>}
        {items.length > 0 && <ul className={list ? 'media-items media-list' : 'media-items media-grid'}>
          {items.map(item => <li key={item.id}><MediaThumbnail item={item} list={list} selected={item.id === selectedId} onOpen={openItem} /></li>)}
        </ul>}
        {gallery.hasNextPage && !gallery.isFetchNextPageError && <Button variant="outline" className="media-more" disabled={gallery.isFetching} onClick={() => gallery.fetchNextPage()}>{t('Mostra altri')}</Button>}
      </section>
    </main>
    <Dialog open={preview && !!selected} onOpenChange={setPreview}>
      {selected && <DialogContent className="media-preview" closeLabel={t('Chiudi')}
        onCloseAutoFocus={event => { event.preventDefault(); if (!confirm && trigger.current?.isConnected) trigger.current.focus(); }}>
        <DialogTitle>{t('Anteprima media')}</DialogTitle>
        <div className="media-preview-image"><Image key={selected.id} src={selected.file_url} alt={selected.name} unavailable={<MissingMedia />} /></div>
        <div className="media-preview-details">
          <DialogDescription>{selected.name}</DialogDescription>
          <div className="media-preview-arrows">
            <button type="button" aria-label={t('Media precedente')} disabled={index < 1} onClick={() => setSelectedId(items[index - 1].id)}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" aria-label={t('Media successivo')} disabled={(index >= items.length - 1 && !gallery.hasNextPage) || gallery.isFetchingNextPage}
              onClick={async () => {
                const next = items[index + 1] || (gallery.hasNextPage && (await gallery.fetchNextPage()).data?.pages.flatMap(page => page.items)[index + 1]);
                if (next) setSelectedId(next.id);
              }}><ChevronRight aria-hidden="true" /></button>
          </div>
        </div>
        <Button disabled={studio.generating || !PRIVATE_FILE.test(selected.file_url)} onClick={requestPost}>{t('Crea post')}</Button>
        {studio.generating && <small role="status">{t('Attendi la fine della generazione.')}</small>}
      </DialogContent>}
    </Dialog>
    <ConfirmAction open={confirm} onOpenChange={open => { setConfirm(open); if (!open) setPreview(true); }}
      title={t('Sostituire la bozza aperta?')} description={t('Le modifiche non salvate della bozza corrente verranno perse.')}
      confirmLabel={t('Sostituisci bozza')} onConfirm={createPost} busy={studio.generating} destructive />
  </>;
}

export default function MediaLibrary() {
  const { user } = useAuth();
  return user ? <AccountMedia key={user.id} user={user} /> : null;
}
