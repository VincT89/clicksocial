import AppSelect from '@/components/AppSelect';
import { useI18n, translate as translateUI, languageLocale } from '@/lib/i18n';
import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import PhotoUploader from '@/components/studio/PhotoUploader';
import PhotoEditor from '@/components/studio/PhotoEditor';
import { DEFAULT_FILTERS } from '@/lib/photoPresets';
import { useStudioState } from '@/lib/StudioStateContext';
import CopyPanel from '@/components/studio/CopyPanel';
import PostCaption from '@/components/studio/PostCaption';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import HelpButton from '@/components/HelpButton';
import ConfirmAction from '@/components/ConfirmAction';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { applyLogoWatermark } from '@/lib/logoWatermark';
import { Plus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isNative } from '@/lib/mobile';
import { newPostDesign } from '../../shared/templates.mjs';
import { DEFAULT_MODE, defaultTone } from '../../shared/postDefaults.mjs';
import { PLATFORMS } from '@/lib/editorialDates.mjs';
import ScheduleDialog from '@/components/library/ScheduleDialog';
import { brandFromProfile, LOGO_VARIANTS } from '../../shared/brand.mjs';
import TemplateSelector from '@/components/studio/TemplateSelector';
import { checkGeneratedTemplate } from '@/lib/templateRenderer';
import ElementSettings from '@/components/studio/ElementSettings';
import PhotoAdjustments from '@/components/studio/PhotoAdjustments';
import StudioDrawer from '@/components/studio/StudioDrawer';
import BrandSettings from '@/components/brand/BrandSettings';
import '@/components/studio/Studio.css';
import PublishChannels from '@/components/studio/PublishChannels';
import { postChannels } from '../../shared/publish-channels.mjs';

export default function Studio() {
  useI18n();
  const { user, appPublicSettings } = useAuth();
  const settings = appPublicSettings?.public_settings || {};
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editorRef = useRef(null);
  const requestDetails = useRef(null);
  const alive = useRef(true);
  const saveLock = useRef(false);
  const generateLock = useRef(false);
  const requestId = useRef('');
  const {
    originalUrl, setOriginalUrl, platform, setPlatform, publication, setPublication, tone: savedTone, setTone, mode, setMode,
    title, setTitle, context, setContext, generating, setGenerating, setGenerationStage, copy, setCopy,
    filters, setFilters, activePreset, setActivePreset, editingId, setEditingId,
    postStatus, setPostStatus, resetDraft, draftRevision,
    design, setDesign, planning, setPlanning, editorialAt, setEditorialAt,
  } = useStudioState();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [me, setMe] = useState(user);
  const tone = savedTone ?? defaultTone(me);
  const [replacement, setReplacement] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState('graphic');
  const [selectedElement, setSelectedElement] = useState('');
  const [elementLayout, setElementLayout] = useState({});
  const [graphicWarning, setGraphicWarning] = useState('');
  const [assetBusy, setAssetBusy] = useState(false);
  const [publishPost, setPublishPost] = useState(null);
  const id = params.get('id');
  const newRequested = params.get('new') === '1';
  const locked = ['in_coda','in_pubblicazione','pubblicato','da_verificare'].includes(postStatus);
  useEffect(() => {
    alive.current = true;
    api.auth.me().then(account => { if (alive.current) setMe(account); }).catch(e => toast.error(translateUI(e.message)));
    return () => { alive.current = false; };
  }, []);
  const loadPost = async postId => {
    const request = postId + ':' + Date.now(); requestId.current = request;
    setLoading(true); setLoadError('');
    try {
      const p = await api.entities.Post.get(postId);
      if (!alive.current || requestId.current !== request) return;
      resetDraft();
      setEditingId(p.id); setOriginalUrl(p.original_image_url || p.image_url);
      setPublication({ channels:postChannels(p), fixed:!!p.publication_group });
      setPlatform(p.platform || 'instagram'); setTone(p.tone || defaultTone(me)); setMode(p.mode || (p.planning && !p.image_url ? DEFAULT_MODE : 'original'));
      setTitle(p.title || ''); setContext(p.context || ''); setPostStatus(p.status === 'fallito' ? 'pronto' : p.status || 'pronto');
      setDesign(p.design || null); setPlanning(p.planning || null); setEditorialAt(p.editorial_at || null);
      const savedGraphic = p.graphic_url || p.image_url;
      setCopy({ headline:p.headline || '', caption:p.caption || p.planning?.provisional_copy || '', hashtags:p.hashtags || '', graphic_subtitle:p.graphic_subtitle || '', graphic_url:p.graphic_url || null, generated_mode:savedGraphic ? (p.mode || 'original') : undefined });
      let savedFilters = { ...DEFAULT_FILTERS };
      try { if (p.editor_filters) savedFilters = { ...savedFilters, ...JSON.parse(p.editor_filters) }; } catch { /* Older content uses the original filter. */ }
      setFilters(savedFilters); setActivePreset(p.editor_preset || 'Originale');
    } catch (e) { if (alive.current) setLoadError(e.message); }
    finally { if (alive.current && requestId.current === request) setLoading(false); }
  };
  useEffect(() => {
    if (newRequested) {
      if (originalUrl) setReplacement({ id:null });
      else { resetDraft(); setParams({}, { replace:true }); }
    } else if (id && id !== editingId) {
      if (originalUrl) setReplacement({ id });
      else loadPost(id);
    }
    return () => { requestId.current = ''; };
    // The draft stays intact when returning from another section.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id,newRequested]);
  const keepDraft = () => {
    setReplacement(null); setParams(editingId ? { id:editingId } : {}, { replace:true });
  };
  const replaceDraft = () => {
    const target = replacement?.id; setReplacement(null);
    if (target) loadPost(target);
    else { resetDraft(); setParams({}, { replace:true }); }
  };
  const used = me?.ai_generations_used || 0;
  const isPro = me?.plan === 'pro';
  const remaining = Math.max(0,2-used);
  const canGenerate = isPro || remaining > 0;
  const generate = async () => {
    if (generateLock.current || saving || loading || locked || assetBusy || publishPost || !originalUrl || !canGenerate || !settings.aiEnabled || mode !== 'original' && !settings.imageAIEnabled) return;
    generateLock.current = true;
    if (document.activeElement instanceof HTMLTextAreaElement) document.activeElement.blur();
    const revision = draftRevision.current;
    setDrawerOpen(false); setGenerationStage('post'); setGenerating(true);
    try {
      const requestDesign = { ...(design || newPostDesign(me)), transparent_overlays: true };
      const result = await api.functions.invoke('generateCopy', { file_url:originalUrl, platform:String(platform).toLowerCase(), tone, mode, context, design: requestDesign, ...(planning && editingId ? { draft_id: editingId } : {}) });
      let graphicUrl = result.data.graphic_url || null;
      if (graphicUrl && result.data.logo_url) {
        if (draftRevision.current === revision) setGenerationStage('logo');
        graphicUrl = await applyLogoWatermark(graphicUrl, result.data.logo_url, result.data.logo_placement);
      }
      if (draftRevision.current !== revision) return;
      if (result.data.design) { setDesign(result.data.design); setSelectedElement(null); }
      setCopy({ ...result.data, graphic_url:graphicUrl });
      if (requestDetails.current) requestDetails.current.open = false;
      if (graphicUrl) { setFilters({ ...DEFAULT_FILTERS }); setActivePreset('Originale'); }
      if (!title) setTitle((result.data.headline || 'Post ' + platform).slice(0,60));
      if (alive.current) setMe(await api.auth.me().catch(() => me));
      if (result.data.design && draftRevision.current === revision) {
        setGenerationStage('template');
        try {
          await checkGeneratedTemplate(graphicUrl || originalUrl, result.data.design, graphicUrl ? DEFAULT_FILTERS : filters, result.data.headline, result.data.graphic_subtitle);
        } catch (error) {
          if (draftRevision.current === revision) toast.error(translateUI("Contenuto generato. Prima di salvare: ") + translateUI(error.message));
          return;
        }
      }
      if (draftRevision.current === revision) toast.success(translateUI("Post pronto. Controlla immagine e descrizione."));
    } catch (e) {
      if (draftRevision.current === revision) {
        if (e.status === 402 && alive.current) setMe(account => ({ ...account, ai_generations_used:2 }));
        toast.error(translateUI("Generazione non riuscita: ") + translateUI(e.message));
      }
    } finally { generateLock.current = false; if (draftRevision.current === revision) setGenerating(false); }
  };
  const save = async (intent = 'draft') => {
    if (saveLock.current || generating || loading || locked || assetBusy || publishPost || !originalUrl) return;
    saveLock.current = true; setSaving(true);
    const revision = draftRevision.current;
    try {
      const exported = await editorRef.current?.exportImage();
      if (!exported) throw new Error('Impossibile esportare la foto.');
      const payload = { title:title.trim() || 'Senza titolo', image_url:exported, original_image_url:originalUrl,
        headline:copy?.headline || '', caption:copy?.caption || '', hashtags:copy?.hashtags || '', context:context || '',
        platform:String(platform).toLowerCase(), publish_channels:channels, tone, mode:copy?.graphic_url ? (design?.text_mode === 'image' ? 'graphic' : copy.generated_mode || mode) : mode, status:'bozza',
        graphic_url:copy?.graphic_url || '', graphic_subtitle:copy?.graphic_subtitle || '', ...(design ? { design } : {}), editor_filters:JSON.stringify(filters), editor_preset:activePreset || 'Originale' };
      const saved = editingId ? await api.entities.Post.update(editingId,payload) : await api.entities.Post.create(payload);
      if (draftRevision.current === revision) { setEditingId(saved.id); setPostStatus(saved.status || 'bozza'); }
      if (alive.current && draftRevision.current === revision) {
        if (intent === 'publish') { setDrawerOpen(false); setPublishPost(saved); setParams({ id: saved.id }, { replace: true }); }
        else { toast.success(translateUI("Salvato nelle bozze")); resetDraft(); navigate('/library?view=drafts'); }
      }
    } catch (e) { toast.error(translateUI("Salvataggio non riuscito: ") + translateUI(e.message)); }
    finally { saveLock.current = false; if (alive.current) setSaving(false); }
  };
  const uploaded = async url => {
    if (planning && editingId) {
      setOriginalUrl(url);
      try { await api.entities.Post.update(editingId, { original_image_url: url }); toast.success(translateUI("Foto collegata alla bozza")); }
      catch (e) { toast.error(translateUI("Non riesco a conservare la foto nella bozza: ") + translateUI(e.message)); }
      return;
    }
    const selectedDesign = design || newPostDesign(me);
    draftRevision.current++; setOriginalUrl(url); setDesign(selectedDesign);
    setParams({}, { replace:true });
  };
  const refreshBrand = async () => {
    try { const account = await api.auth.me(); setMe(account); setDesign(current => ({ ...current, brand: brandFromProfile(account) })); toast.success(translateUI("Identità aziendale aggiornata in questa anteprima")); }
    catch (e) { toast.error(translateUI(e.message)); }
  };
  const planningSummary = planning && <section data-tour="studio-planning" className="rounded-xl border border-border bg-card p-4 mb-6 space-y-2">
    <h2 className="font-heading text-lg break-words">{translateUI("Dalla bozza:")} {planning.topic}</h2>
    {editorialAt && <p className="text-sm text-muted-foreground">{translateUI("Pubblicazione prevista:")} {new Date(editorialAt).toLocaleString(languageLocale(), { dateStyle:'short', timeStyle:'short' })}</p>}
    {planning.objective && <p className="text-sm whitespace-pre-wrap break-words">{planning.objective}</p>}
    <details className="text-sm"><summary className="cursor-pointer min-h-11 flex items-center">{translateUI("Brief e scatti da preparare")}</summary>
      {[['Scatti',planning.shots],['Testo provvisorio',planning.provisional_copy],['Note',planning.notes]].filter(([,text]) => text).map(([label,text]) => <div key={label} className="mt-3"><p className="font-medium">{translateUI(label)}</p><p className="text-muted-foreground whitespace-pre-wrap break-words">{text}</p></div>)}
    </details>
    <p className="text-xs text-muted-foreground">{translateUI("Queste informazioni guidano la generazione. Il post mantiene la bozza e la data prevista.")}</p>
  </section>;
  const controlsDisabled = saving || generating || loading || locked || assetBusy || !!publishPost || !!loadError;
  const channels = publication?.channels ?? postChannels({ platform });
  const changeChannels = next => {
    if (publication?.fixed) return;
    setPublication({ channels:next, fixed:false });
    if (next.length && !next.includes(String(platform).toLowerCase())) setPlatform(next[0]);
  };
  const captionPlatform = channels.length === 2 ? translateUI('Instagram e Facebook') : PLATFORMS[channels[0]];
  const activeDesign = design || newPostDesign(me);
  /** Il testo provvisorio della pianificazione resta nella bozza, ma non indica che la foto sia già diventata un post. */
  const provisionalCopy = planning && !copy?.generated_mode && copy?.caption === planning.provisional_copy;
  const hasContent = !!(copy?.headline || copy?.graphic_url || copy?.hashtags || (copy?.caption && !provisionalCopy));
  const aiAvailable = !!settings.aiEnabled && (mode === 'original' || !!settings.imageAIEnabled);
  const changeDesign = value => setDesign(current => typeof value === 'function' ? value(current || newPostDesign(me)) : value);
  const convertLegacy = () => { setDesign(newPostDesign(me)); setMode('original'); setCopy({ ...copy, graphic_url: null }); };
  const selectElement = role => { setSelectedElement(role); if (role) setDrawerTab('graphic'); };
  const requestField = (
    <div className="studio-brief">
      <label htmlFor="post-context" className="text-sm font-medium">{translateUI("Cosa vuoi comunicare?")} <span className="text-xs font-normal text-muted-foreground">{translateUI("(facoltativo)")}</span>
      </label>
      <textarea id="post-context" value={context} onChange={event => setContext(event.target.value)}
        maxLength={2000} rows={2} readOnly={locked} disabled={controlsDisabled && !locked} placeholder={translateUI("Es. oggi caffè a 1 euro")} />
    </div>
  );
  const generateButton = (
    <Button data-tour="studio-generate" onClick={generate} disabled={controlsDisabled || !aiAvailable || !canGenerate}
      variant={hasContent ? 'ghost' : 'default'}>
      {generating ? translateUI("Generazione in corso…") : hasContent ? translateUI("Rigenera") : translateUI("Genera")}
    </Button>
  );
  const saveButtons = !locked && (
    <div className="studio-save-actions">
      {hasContent && <Button data-tour="studio-publish" onClick={() => save('publish')} disabled={controlsDisabled || !channels.length}>{translateUI("Pubblica")}</Button>}
      <Button data-tour="studio-save" onClick={() => save('draft')} variant="outline" disabled={controlsDisabled} aria-busy={saving}>
        {saving ? translateUI("Salvataggio…") : translateUI("Salva in bozze")}
      </Button>
    </div>
  );
  let generationNote;
  if (!aiAvailable) {
    generationNote = translateUI('La generazione non è disponibile al momento. Puoi salvare la foto in bozza.');
  } else if (!canGenerate) {
    generationNote = <>{translateUI("Hai utilizzato le generazioni gratuite.")} <Link className="underline" to="/profilo?section=plan">{translateUI("Apri il piano")}</Link></>;
  } else if (!hasContent) {
    generationNote = translateUI('Prepariamo grafica, descrizione e hashtag per {platform}.', { platform:captionPlatform || translateUI('il social') });
  }
  const drawer = <StudioDrawer open={drawerOpen} onOpenChange={open => { if (!assetBusy) setDrawerOpen(open); }} tab={drawerTab} onTabChange={setDrawerTab} busy={assetBusy}>
    <fieldset disabled={controlsDisabled} className="space-y-5 min-w-0">
      {drawerTab === 'graphic' && <>
        {originalUrl && graphicWarning && <details className="studio-settings-section"><summary>{translateUI("Avvisi grafica")}</summary><p role="status" className="pt-2 text-sm text-muted-foreground">{graphicWarning}</p></details>}
        {originalUrl && !design ? <div data-tour="studio-legacy" className="space-y-3"><p className="text-sm">{translateUI("Questo post usa la composizione precedente. Applica un template alla foto originale per modificare separatamente logo e scritte.")}</p><Button variant="outline" onClick={convertLegacy}>{translateUI("Applica un template alla foto originale")}</Button></div> : <>
          <ElementSettings design={activeDesign} onChange={changeDesign} selected={selectedElement} onSelect={selectElement} layout={elementLayout} onBusyChange={setAssetBusy} copy={copy} onCopyChange={setCopy} />
          <details className="studio-settings-section"><summary>{translateUI("Formato e schemi iniziali")}</summary><div className="pt-4"><TemplateSelector value={activeDesign} onChange={changeDesign} disabled={controlsDisabled || assetBusy} integrated={mode === 'graphic'} /></div></details>
          <details className="studio-settings-section"><summary>{translateUI("Loghi e colori del post")}</summary><div className="pt-4 space-y-4">
            <div><label htmlFor="studio-logo" className="text-sm font-medium block mb-2">{translateUI("Variante del logo")}</label><AppSelect id="studio-logo" className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={activeDesign.logo_variant} onChange={event => changeDesign(current => ({ ...current, logo_variant: event.target.value }))}><option value="auto">{translateUI("Automatica in base al contrasto")}</option>{Object.entries(LOGO_VARIANTS).map(([key,label]) => <option key={key} value={key} disabled={!activeDesign.brand.logos[key].url}>{translateUI(label)}</option>)}</AppSelect></div>
            <BrandSettings value={activeDesign.brand} onChange={brand => changeDesign(current => ({ ...current, brand }))} onBusyChange={setAssetBusy} showFonts={false} />
            <button type="button" data-tour="studio-brand-refresh" disabled={assetBusy} className="min-h-11 text-sm underline" onClick={refreshBrand}>{translateUI("Usa le impostazioni aziendali aggiornate")}</button>
          </div></details>
        </>}
      </>}
      {drawerTab === 'photo' && <>
        {design?.text_mode === 'image' ? <p className="text-sm text-muted-foreground">{translateUI("La grafica mantiene l’inquadratura completa per preservare le scritte. Per cambiarla, aggiorna le indicazioni e rigenera dalla foto originale.")}</p> : design && <fieldset className="space-y-3"><legend className="text-sm font-medium mb-2">{translateUI("Inquadratura della foto")}</legend>{[['x','Ritaglio orizzontale'],['y','Ritaglio verticale']].map(([key,label]) => <div key={key}><label htmlFor={'crop-'+key} className="text-sm">{translateUI(label)}</label><input id={'crop-'+key} type="range" min="0" max="1" step="0.01" value={design.crop[key]} onChange={event => changeDesign(current => ({ ...current, crop: { ...current.crop, [key]: Number(event.target.value) } }))} className="w-full h-11" /></div>)}</fieldset>}
        <PhotoAdjustments filters={filters} activePreset={activePreset} onFiltersChange={setFilters} onPresetChange={setActivePreset} disabled={controlsDisabled || !originalUrl} />
      </>}
      {drawerTab === 'copy' && <div data-tour="studio-copy"><CopyPanel channels={channels} onChannelsChange={changeChannels} fixedChannel={publication?.fixed} tone={tone} setTone={setTone} mode={mode} setMode={setMode} generating={generating} copy={copy} setCopy={setCopy} imageText={activeDesign.text_mode === 'image'} templateMode={!!design || !originalUrl} autoTextStyle={activeDesign.ai_text_style === true} onAutoTextStyleChange={enabled => changeDesign(current => ({ ...current, ai_text_style: enabled }))} /></div>}
      {drawerTab === 'post' && <>
        <div data-tour="studio-title" className="space-y-2"><label htmlFor="post-title" className="text-sm font-medium">{translateUI("Titolo del post salvato")}</label><Input id="post-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} placeholder={translateUI("Nome interno del contenuto")} /></div>
        <p className="text-sm text-muted-foreground">{translateUI("Salva in bozze conserva il post per dopo. Pubblica apre la conferma dell’account di destinazione.")}</p>
        {planningSummary}
        <p className="text-sm text-muted-foreground">{isNative ? translateUI("La bozza viene conservata su questo dispositivo. Salvala per ritrovarla anche in I miei post.") : translateUI("La bozza resta disponibile quando cambi sezione. Salva prima di ricaricare o chiudere la pagina.")}</p>
        {!isPro && <p className="text-sm text-muted-foreground">{translateUI("Generazioni AI disponibili:")} {remaining}. <Link className="underline" to="/profilo?section=plan">{translateUI("Apri il piano")}</Link></p>}
      </>}
    </fieldset>
  </StudioDrawer>;
  const landscapeGuide = <span className="studio-landscape-guide"><HelpButton /></span>;
  return <div className={"studio-shell bg-background" + (hasContent ? " is-generated" : "")}>
    <WorkspaceHeader subtitle={translateUI("Crea post")} />
    <main className={originalUrl && !loading && !loadError ? 'studio-main studio-main-with-photo' : 'studio-main'}>
      {loading ? <p role="status">{translateUI("Caricamento del post…")}</p> : loadError ? <div role="alert" className="space-y-3"><p>{loadError}</p><Button onClick={() => loadPost(id)}>{translateUI("Riprova")}</Button><Button variant="outline" asChild><Link to="/library">{translateUI("Vai ai miei post")}</Link></Button></div> : <>
        <div className="studio-toolbar">
          <h1 className="font-heading text-lg truncate">{title || (editingId ? translateUI("Il tuo post") : translateUI("Crea il tuo post"))}</h1>
          {!originalUrl && landscapeGuide}
          {originalUrl && <Button variant="ghost" disabled={controlsDisabled} onClick={() => setReplacement({ id: null })}>
            <Plus size={18} aria-hidden="true" />{translateUI("Nuovo post")}</Button>}
        </div>
        {locked && <p className="studio-status text-xs text-muted-foreground">{postStatus === 'pubblicato' ? translateUI("Post pubblicato: sola lettura.") : translateUI("Annulla l’invio automatico da I miei post per modificarlo.")} <Link to="/library" className="underline">{translateUI("Vai ai miei post")}</Link></p>}
        <div className="studio-content">
          {!originalUrl ? <div className="studio-empty"><PhotoUploader onUploaded={uploaded} /></div> : <section className="studio-preview-panel" aria-labelledby="studio-preview-title">
            <PhotoEditor ref={editorRef} disabled={controlsDisabled} imageUrl={copy?.graphic_url || originalUrl}
              headline={design || !copy?.graphic_url ? copy?.headline || null : null} subtitle={copy?.graphic_subtitle || ''}
              design={design} filters={filters} onDesignChange={changeDesign} selectedElement={selectedElement} onSelectElement={selectElement}
              elementLayout={elementLayout} onLayoutChange={setElementLayout} onWarningChange={setGraphicWarning}>
              <div className="studio-preview-tools"><h2 id="studio-preview-title">{translateUI("Anteprima")}</h2>{landscapeGuide}{drawer}</div>
            </PhotoEditor>
          </section>}
          {originalUrl && <section className="studio-result" aria-label={translateUI("Il tuo post")}>
            {hasContent ? <>
              <PostCaption platform={captionPlatform}
                value={[copy?.caption, copy?.hashtags].filter(Boolean).join('\n\n')}
                onChange={caption => setCopy({ ...copy, caption, hashtags: '' })}
                readOnly={locked} disabled={controlsDisabled && !locked} />
              {!locked && <PublishChannels channels={channels} onChange={changeChannels} disabled={controlsDisabled || publication?.fixed} />}
              {saveButtons}
              {(!locked || context) && <div className="studio-revision">
                <details ref={requestDetails} data-tour="studio-context">
                  <summary aria-label={locked ? translateUI("Leggi la richiesta") : translateUI("Modifica richiesta")}>
                    <span className="studio-request-text">{context.trim() || translateUI("Dalla foto")}</span>
                    <span className="studio-request-toggle">{locked ? translateUI("Leggi") : translateUI("Modifica richiesta")}</span>
                  </summary>
                  {requestField}
                </details>
                {!locked && generateButton}
              </div>}
              {!locked && generationNote && <p className="studio-action-note" role="status">{generationNote}</p>}
            </> : <>
              <div data-tour="studio-context">{requestField}</div>
              {!locked && <div className="studio-actions">
                {generateButton}
                {saveButtons}
                {generationNote && <p className="studio-action-note" role="status">{generationNote}</p>}
              </div>}
            </>}
          </section>}
        </div>
      </>}
      {!originalUrl && <div className="studio-footer">{drawer}</div>}
    </main>
    <ConfirmAction open={!!replacement} onOpenChange={open => { if (!open) keepDraft(); }} title={translateUI("Sostituire la bozza aperta?")} description={translateUI("Le modifiche non salvate della bozza corrente verranno perse.")} confirmLabel={translateUI("Sostituisci bozza")} onConfirm={replaceDraft} busy={saving || generating || assetBusy} destructive />
    {publishPost && <ScheduleDialog post={publishPost} open onOpenChange={open => { if (!open) setPublishPost(null); }} onScheduled={async () => { setPublishPost(null); resetDraft(); navigate('/library'); }} />}
  </div>;
}
