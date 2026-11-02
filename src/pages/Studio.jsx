import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import PhotoUploader from '@/components/studio/PhotoUploader';
import PhotoEditor from '@/components/studio/PhotoEditor';
import { DEFAULT_FILTERS } from '@/lib/photoPresets';
import { useStudioState } from '@/lib/StudioStateContext';
import CopyPanel from '@/components/studio/CopyPanel';
import WorkspaceHeader from '@/components/WorkspaceHeader';
import IconHint from '@/components/IconHint';
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

export default function Studio() {
  const { user, appPublicSettings } = useAuth();
  const settings = appPublicSettings?.public_settings || {};
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const editorRef = useRef(null);
  const alive = useRef(true);
  const saveLock = useRef(false);
  const generateLock = useRef(false);
  const requestId = useRef('');
  const {
    originalUrl, setOriginalUrl, platform, setPlatform, tone: savedTone, setTone, mode, setMode,
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
    api.auth.me().then(account => { if (alive.current) setMe(account); }).catch(e => toast.error(e.message));
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
      setPlatform(p.platform || 'instagram'); setTone(p.tone || defaultTone(me)); setMode(p.mode || (p.planning && !p.image_url ? DEFAULT_MODE : 'original'));
      setTitle(p.title || ''); setContext(p.context || ''); setPostStatus(p.status === 'fallito' ? 'pronto' : p.status || 'pronto');
      setDesign(p.design || null); setPlanning(p.planning || null); setEditorialAt(p.editorial_at || null);
      setCopy({ headline:p.headline || '', caption:p.caption || p.planning?.provisional_copy || '', hashtags:p.hashtags || '', graphic_subtitle:p.graphic_subtitle || '', graphic_url:p.graphic_url || null, generated_mode:p.mode });
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
      if (graphicUrl) { setFilters({ ...DEFAULT_FILTERS }); setActivePreset('Originale'); }
      if (!title) setTitle((result.data.headline || 'Post ' + platform).slice(0,60));
      if (alive.current) setMe(await api.auth.me().catch(() => me));
      if (result.data.design && draftRevision.current === revision) {
        setGenerationStage('template');
        try {
          await checkGeneratedTemplate(graphicUrl || originalUrl, result.data.design, graphicUrl ? DEFAULT_FILTERS : filters, result.data.headline, result.data.graphic_subtitle);
        } catch (error) {
          if (draftRevision.current === revision) toast.error('Contenuto generato. Prima di salvare: ' + error.message);
          return;
        }
      }
      if (draftRevision.current === revision) toast.success('Post pronto. Controlla immagine e descrizione.');
    } catch (e) {
      if (draftRevision.current === revision) {
        if (e.status === 402 && alive.current) setMe(account => ({ ...account, ai_generations_used:2 }));
        toast.error('Generazione non riuscita: ' + e.message);
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
        platform:String(platform).toLowerCase(), tone, mode:copy?.graphic_url ? (design?.text_mode === 'image' ? 'graphic' : copy.generated_mode || mode) : mode, status:'bozza',
        graphic_url:copy?.graphic_url || '', graphic_subtitle:copy?.graphic_subtitle || '', ...(design ? { design } : {}), editor_filters:JSON.stringify(filters), editor_preset:activePreset || 'Originale' };
      const saved = editingId ? await api.entities.Post.update(editingId,payload) : await api.entities.Post.create(payload);
      if (draftRevision.current === revision) { setEditingId(saved.id); setPostStatus(saved.status || 'bozza'); }
      if (alive.current && draftRevision.current === revision) {
        if (intent === 'publish') { setDrawerOpen(false); setPublishPost(saved); setParams({ id: saved.id }, { replace: true }); }
        else { toast.success('Salvato nelle bozze'); resetDraft(); navigate('/library?view=drafts'); }
      }
    } catch (e) { toast.error('Salvataggio non riuscito: ' + e.message); }
    finally { saveLock.current = false; if (alive.current) setSaving(false); }
  };
  const uploaded = async url => {
    if (planning && editingId) {
      setOriginalUrl(url);
      try { await api.entities.Post.update(editingId, { original_image_url: url }); toast.success('Foto collegata alla bozza'); }
      catch (e) { toast.error('Non riesco a conservare la foto nella bozza: ' + e.message); }
      return;
    }
    const selectedDesign = design || newPostDesign(me);
    draftRevision.current++; setOriginalUrl(url); setDesign(selectedDesign);
    setParams({}, { replace:true });
  };
  const refreshBrand = async () => {
    try { const account = await api.auth.me(); setMe(account); setDesign(current => ({ ...current, brand: brandFromProfile(account) })); toast.success('Identità aziendale aggiornata in questa anteprima'); }
    catch (e) { toast.error(e.message); }
  };
  const planningSummary = planning && <section data-tour="studio-planning" className="rounded-xl border border-border bg-card p-4 mb-6 space-y-2">
    <h2 className="font-heading text-lg break-words">Dalla bozza: {planning.topic}</h2>
    {editorialAt && <p className="text-sm text-muted-foreground">Pubblicazione prevista: {new Date(editorialAt).toLocaleString('it-IT', { dateStyle:'short', timeStyle:'short' })}</p>}
    {planning.objective && <p className="text-sm whitespace-pre-wrap break-words">{planning.objective}</p>}
    <details className="text-sm"><summary className="cursor-pointer min-h-11 flex items-center">Brief e scatti da preparare</summary>
      {[['Scatti',planning.shots],['Testo provvisorio',planning.provisional_copy],['Note',planning.notes]].filter(([,text]) => text).map(([label,text]) => <div key={label} className="mt-3"><p className="font-medium">{label}</p><p className="text-muted-foreground whitespace-pre-wrap break-words">{text}</p></div>)}
    </details>
    <p className="text-xs text-muted-foreground">Queste informazioni guidano la generazione. Il post mantiene la bozza e la data prevista.</p>
  </section>;
  const controlsDisabled = saving || generating || loading || locked || assetBusy || !!publishPost || !!loadError;
  const activeDesign = design || newPostDesign(me);
  const hasContent = !!(copy?.headline || copy?.caption || copy?.graphic_url);
  const aiAvailable = !!settings.aiEnabled && (mode === 'original' || !!settings.imageAIEnabled);
  const changeDesign = value => setDesign(current => typeof value === 'function' ? value(current || newPostDesign(me)) : value);
  const convertLegacy = () => { setDesign(newPostDesign(me)); setMode('original'); setCopy({ ...copy, graphic_url: null }); };
  const selectElement = role => { setSelectedElement(role); if (role) setDrawerTab('graphic'); };
  const drawer = <StudioDrawer open={drawerOpen} onOpenChange={open => { if (!assetBusy) setDrawerOpen(open); }} tab={drawerTab} onTabChange={setDrawerTab} busy={assetBusy}>
    <fieldset disabled={controlsDisabled} className="space-y-5 min-w-0">
      {drawerTab === 'graphic' && <>
        {originalUrl && graphicWarning && <details className="studio-settings-section"><summary>Avvisi grafica</summary><p role="status" className="pt-2 text-sm text-muted-foreground">{graphicWarning}</p></details>}
        {originalUrl && !design ? <div data-tour="studio-legacy" className="space-y-3"><p className="text-sm">Questo post usa la composizione precedente. Applica un template alla foto originale per modificare separatamente logo e scritte.</p><Button variant="outline" onClick={convertLegacy}>Applica un template alla foto originale</Button></div> : <>
          <ElementSettings design={activeDesign} onChange={changeDesign} selected={selectedElement} onSelect={selectElement} layout={elementLayout} onBusyChange={setAssetBusy} copy={copy} onCopyChange={setCopy} />
          <details className="studio-settings-section"><summary>Formato e schemi iniziali</summary><div className="pt-4"><TemplateSelector value={activeDesign} onChange={changeDesign} disabled={controlsDisabled || assetBusy} integrated={mode === 'graphic'} /></div></details>
          <details className="studio-settings-section"><summary>Loghi e colori del post</summary><div className="pt-4 space-y-4">
            <div><label htmlFor="studio-logo" className="text-sm font-medium block mb-2">Variante del logo</label><select id="studio-logo" className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={activeDesign.logo_variant} onChange={event => changeDesign(current => ({ ...current, logo_variant: event.target.value }))}><option value="auto">Automatica in base al contrasto</option>{Object.entries(LOGO_VARIANTS).map(([key,label]) => <option key={key} value={key} disabled={!activeDesign.brand.logos[key].url}>{label}</option>)}</select></div>
            <BrandSettings value={activeDesign.brand} onChange={brand => changeDesign(current => ({ ...current, brand }))} onBusyChange={setAssetBusy} showFonts={false} />
            <button type="button" data-tour="studio-brand-refresh" disabled={assetBusy} className="min-h-11 text-sm underline" onClick={refreshBrand}>Usa le impostazioni aziendali aggiornate</button>
          </div></details>
        </>}
      </>}
      {drawerTab === 'photo' && <>
        {design?.text_mode === 'image' ? <p className="text-sm text-muted-foreground">La grafica mantiene l’inquadratura completa per preservare le scritte. Per cambiarla, aggiorna le indicazioni e rigenera dalla foto originale.</p> : design && <fieldset className="space-y-3"><legend className="text-sm font-medium mb-2">Inquadratura della foto</legend>{[['x','Ritaglio orizzontale'],['y','Ritaglio verticale']].map(([key,label]) => <div key={key}><label htmlFor={'crop-'+key} className="text-sm">{label}</label><input id={'crop-'+key} type="range" min="0" max="1" step="0.01" value={design.crop[key]} onChange={event => changeDesign(current => ({ ...current, crop: { ...current.crop, [key]: Number(event.target.value) } }))} className="w-full h-11" /></div>)}</fieldset>}
        <PhotoAdjustments filters={filters} activePreset={activePreset} onFiltersChange={setFilters} onPresetChange={setActivePreset} disabled={controlsDisabled || !originalUrl} />
      </>}
      {drawerTab === 'copy' && <div data-tour="studio-copy"><CopyPanel platform={platform} setPlatform={setPlatform} tone={tone} setTone={setTone} mode={mode} setMode={setMode} generating={generating} copy={copy} setCopy={setCopy} imageText={activeDesign.text_mode === 'image'} templateMode={!!design || !originalUrl} autoTextStyle={activeDesign.ai_text_style === true} onAutoTextStyleChange={enabled => changeDesign(current => ({ ...current, ai_text_style: enabled }))} /></div>}
      {drawerTab === 'post' && <>
        <div data-tour="studio-title" className="space-y-2"><label htmlFor="post-title" className="text-sm font-medium">Titolo nella Libreria</label><Input id="post-title" value={title} onChange={event => setTitle(event.target.value)} maxLength={200} placeholder="Nome interno del contenuto" /></div>
        <p className="text-sm text-muted-foreground">Salva in bozze conserva il post per dopo. Pubblica apre la conferma dell’account di destinazione.</p>
        {planningSummary}
        <p className="text-sm text-muted-foreground">{isNative ? 'La bozza viene conservata su questo dispositivo. Salva il post per ritrovarlo nella Libreria.' : 'La bozza resta disponibile quando cambi sezione. Salva prima di ricaricare o chiudere la pagina.'}</p>
        {!isPro && <p className="text-sm text-muted-foreground">Generazioni AI disponibili: {remaining}. <Link className="underline" to="/profilo?section=plan">Apri il piano</Link></p>}
      </>}
    </fieldset>
  </StudioDrawer>;
  return <div className="studio-shell bg-background">
    <WorkspaceHeader subtitle="Studio" />
    <main className="studio-main">
      {loading ? <p role="status">Caricamento del post…</p> : loadError ? <div role="alert" className="space-y-3"><p>{loadError}</p><Button onClick={() => loadPost(id)}>Riprova</Button><Button variant="outline" asChild><Link to="/library">Torna alla Libreria</Link></Button></div> : <>
        <div className="studio-toolbar"><h1 className="font-heading text-lg truncate">{title || (editingId ? 'Il tuo post' : 'Crea il tuo post')}</h1>{originalUrl && <IconHint label="Nuova foto"><button type="button" disabled={controlsDisabled} onClick={() => setReplacement({ id: null })} className="nav-icon" aria-label="Nuova foto"><Plus size={20} aria-hidden="true" /></button></IconHint>}</div>
        {locked && <p className="text-xs text-muted-foreground">{postStatus === 'pubblicato' ? 'Post pubblicato: sola lettura.' : 'Annulla l’invio automatico dalla Libreria per modificare il post.'} <Link to="/library" className="underline">Apri Libreria</Link></p>}
        <div className="studio-content">
          {!originalUrl ? <div className="studio-empty"><PhotoUploader onUploaded={uploaded} /></div> : <PhotoEditor ref={editorRef} disabled={controlsDisabled} imageUrl={copy?.graphic_url || originalUrl} headline={design || !copy?.graphic_url ? copy?.headline || null : null} subtitle={copy?.graphic_subtitle || ''} design={design} filters={filters} onDesignChange={changeDesign} selectedElement={selectedElement} onSelectElement={selectElement} elementLayout={elementLayout} onLayoutChange={setElementLayout} onWarningChange={setGraphicWarning} />}
          {originalUrl && <section className="studio-result" aria-label="Il tuo post">
            <div className="studio-brief" data-tour="studio-context"><label htmlFor="post-context" className="text-sm font-medium">Cosa vuoi comunicare? <span className="text-xs font-normal text-muted-foreground">(facoltativo)</span></label><textarea id="post-context" value={context} onChange={event => setContext(event.target.value)} maxLength={2000} rows={2} readOnly={locked} disabled={controlsDisabled && !locked} placeholder="Es. oggi caffè a 1 euro" /></div>
            {hasContent && <div className="studio-caption" data-tour="studio-copy-result"><label htmlFor="post-caption" className="block text-sm font-medium">Descrizione del post</label><textarea id="post-caption" value={[copy?.caption, copy?.hashtags].filter(Boolean).join('\n\n')} onChange={event => setCopy({ ...copy, caption: event.target.value, hashtags: '' })} readOnly={locked} disabled={controlsDisabled && !locked} maxLength={10000} rows={3} placeholder="Il testo che accompagnerà la foto" /><p className="text-xs text-muted-foreground">{locked ? 'Testo salvato con il post.' : 'Puoi correggere il testo prima di pubblicare.'}</p></div>}
            {originalUrl && !locked && <div className="studio-actions">
              <Button data-tour="studio-generate" onClick={generate} disabled={controlsDisabled || !aiAvailable || !canGenerate} variant={hasContent ? 'outline' : 'default'}>{generating ? 'Generazione in corso…' : hasContent ? 'Rigenera' : 'Genera'}</Button>
              {!aiAvailable ? <p className="studio-action-note" role="status">La generazione non è disponibile al momento. Puoi salvare la foto in bozza.</p> : !canGenerate ? <p className="studio-action-note">Hai utilizzato le generazioni gratuite. <Link className="underline" to="/profilo?section=plan">Apri il piano</Link></p> : !hasContent && <p className="studio-action-note">Prepariamo grafica, descrizione e hashtag per {PLATFORMS[String(platform).toLowerCase()]}.</p>}
              <div className="studio-save-actions"><Button data-tour="studio-save" onClick={() => save('draft')} variant="outline" disabled={controlsDisabled} aria-busy={saving}>{saving ? 'Salvataggio…' : 'Salva in bozze'}</Button>{hasContent && <Button data-tour="studio-publish" onClick={() => save('publish')} disabled={controlsDisabled}>Pubblica</Button>}</div>
            </div>}
          </section>}
        </div>
      </>}
      <div className="studio-footer"><p className="text-xs text-muted-foreground">{locked ? 'Apri la Libreria per gestire il post.' : 'Vuoi personalizzarlo? Le impostazioni sono facoltative.'}</p>{drawer}</div>
    </main>
    <ConfirmAction open={!!replacement} onOpenChange={open => { if (!open) keepDraft(); }} title="Sostituire la bozza aperta?" description="Le modifiche non salvate della bozza corrente verranno perse." confirmLabel="Sostituisci bozza" onConfirm={replaceDraft} busy={saving || generating || assetBusy} destructive />
    {publishPost && <ScheduleDialog post={publishPost} open onOpenChange={open => { if (!open) setPublishPost(null); }} onScheduled={async () => { setPublishPost(null); resetDraft(); navigate('/library'); }} />}
  </div>;
}
