import { useEffect, useRef, useState } from 'react';
import { api } from '@/api/client';
import PhotoUploader from '@/components/studio/PhotoUploader';
import PhotoEditor, { DEFAULT_FILTERS } from '@/components/studio/PhotoEditor';
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
import { Save, Plus } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { isNative } from '@/lib/mobile';
import { defaultDesign } from '../../shared/templates.mjs';
import { brandFromProfile, LOGO_VARIANTS } from '../../shared/brand.mjs';
import TemplateSelector from '@/components/studio/TemplateSelector';
import { checkGeneratedTemplate } from '@/lib/templateRenderer';

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
    originalUrl, setOriginalUrl, platform, setPlatform, tone, setTone, mode, setMode,
    title, setTitle, context, setContext, generating, setGenerating, setGenerationStage, copy, setCopy,
    filters, setFilters, activePreset, setActivePreset, editingId, setEditingId,
    postStatus, setPostStatus, resetDraft, draftRevision,
    design, setDesign, planning, setPlanning, editorialAt, setEditorialAt,
  } = useStudioState();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [me, setMe] = useState(user);
  const [replacement, setReplacement] = useState(null);
  const id = params.get('id');
  const newRequested = params.get('new') === '1';
  const locked = ['in_coda','in_pubblicazione','pubblicato'].includes(postStatus);
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
      setPlatform(p.platform || 'instagram'); setTone(p.tone || 'amichevole'); setMode(p.mode || 'original');
      setTitle(p.title || ''); setContext(p.context || ''); setPostStatus(p.status === 'fallito' ? 'pronto' : p.status || 'pronto');
      setDesign(p.design || null); setPlanning(p.planning || null); setEditorialAt(p.editorial_at || null);
      setCopy({ headline:p.headline || '', caption:p.caption || p.planning?.provisional_copy || '', hashtags:p.hashtags || '', graphic_subtitle:p.graphic_subtitle || '', graphic_url:p.graphic_url || null });
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
    if (generateLock.current || locked || !canGenerate) return;
    generateLock.current = true;
    const revision = draftRevision.current;
    setGenerationStage('post'); setGenerating(true);
    try {
      const result = await api.functions.invoke('generateCopy', { file_url:originalUrl, platform:String(platform).toLowerCase(), tone, mode, context, ...(design ? { design } : {}), ...(planning && editingId ? { draft_id: editingId } : {}) });
      let graphicUrl = result.data.graphic_url || null;
      if (graphicUrl && result.data.logo_url) {
        if (draftRevision.current === revision) setGenerationStage('logo');
        graphicUrl = await applyLogoWatermark(graphicUrl, result.data.logo_url, result.data.logo_placement);
      }
      if (draftRevision.current !== revision) return;
      if (result.data.design) setDesign(result.data.design);
      setCopy({ ...result.data, graphic_url:graphicUrl });
      if (graphicUrl) { setFilters({ ...DEFAULT_FILTERS }); setActivePreset('Originale'); }
      if (!title) setTitle((result.data.headline || 'Post ' + platform).slice(0,60));
      if (alive.current) setMe(await api.auth.me());
      if (result.data.design && draftRevision.current === revision) {
        setGenerationStage('template');
        try {
          await checkGeneratedTemplate(graphicUrl || originalUrl, result.data.design, graphicUrl ? DEFAULT_FILTERS : filters, result.data.headline, result.data.graphic_subtitle);
        } catch (error) {
          if (draftRevision.current === revision) toast.error('Contenuto generato. Prima di salvare: ' + error.message);
          return;
        }
      }
      if (draftRevision.current === revision) toast.success('Anteprima pronta nello Studio');
    } catch (e) {
      if (draftRevision.current === revision) {
        if (e.status === 402 && alive.current) setMe(account => ({ ...account, ai_generations_used:2 }));
        toast.error('Generazione non riuscita: ' + e.message);
      }
    } finally { generateLock.current = false; if (draftRevision.current === revision) setGenerating(false); }
  };
  const save = async () => {
    if (saveLock.current || locked) return;
    saveLock.current = true; setSaving(true);
    const revision = draftRevision.current;
    try {
      const exported = await editorRef.current?.exportImage();
      if (!exported) throw new Error('Impossibile esportare la foto.');
      const payload = { title:title.trim() || 'Senza titolo', image_url:exported, original_image_url:originalUrl,
        headline:copy?.headline || '', caption:copy?.caption || '', hashtags:copy?.hashtags || '', context:context || '',
        platform:String(platform).toLowerCase(), tone, mode, status:postStatus,
        graphic_url:copy?.graphic_url || '', graphic_subtitle:copy?.graphic_subtitle || '', ...(design ? { design } : {}), editor_filters:JSON.stringify(filters), editor_preset:activePreset || 'Originale' };
      const saved = editingId ? await api.entities.Post.update(editingId,payload) : await api.entities.Post.create(payload);
      if (draftRevision.current === revision) { setEditingId(saved.id); }
      toast.success('Post salvato nella Libreria');
      if (alive.current && draftRevision.current === revision) {
        resetDraft(); navigate('/library');
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
    const selectedDesign = design || defaultDesign(me);
    resetDraft(); setOriginalUrl(url); setDesign(selectedDesign);
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
  return <div className="min-h-screen bg-background">
    <WorkspaceHeader subtitle="Studio" actions={originalUrl && <IconHint label={saving ? 'Salvataggio in corso' : 'Salva post'}><button type="button" data-tour="studio-save" onClick={save} disabled={saving || generating || loading || locked || !!loadError} aria-label={saving ? 'Salvataggio in corso' : 'Salva post'} aria-busy={saving} className="nav-icon bg-purple text-white hover:bg-purple-dark hover:text-white"><Save size={20} aria-hidden="true" /></button></IconHint>} />
    <main className="workspace-main">
      {loading ? <p role="status">Caricamento del post…</p> : loadError ? <div role="alert" className="space-y-3"><p>{loadError}</p><Button onClick={() => loadPost(id)}>Riprova</Button><Button variant="outline" asChild><Link to="/library">Torna alla Libreria</Link></Button></div> : !originalUrl ? <div className="max-w-2xl mx-auto">
        <h1 className="workspace-title text-center">{planning ? 'Genera il post dalla bozza' : 'Crea il tuo prossimo post'}</h1>
        <p className="text-muted-foreground text-sm text-center mt-3 mb-8">Parti da una foto, prepara grafica e testo, poi scegli quando pubblicare.</p>
        {planningSummary}
        <div className="mb-6"><TemplateSelector value={design || defaultDesign(me)} onChange={setDesign} /></div>
        <PhotoUploader onUploaded={uploaded} />
        {!planning && <p className="mt-5 text-sm text-center"><Link className="text-purple underline min-h-11 inline-flex items-center" to="/library">Non hai ancora le foto? Prepara una bozza nella Libreria.</Link></p>}
      </div> : <>
        <div className="flex items-start justify-between gap-3 mb-6"><div><h1 className="workspace-title">{editingId ? 'Il tuo contenuto' : 'Nuovo contenuto'}</h1><p className="text-xs text-muted-foreground mt-2">{isNative ? 'La bozza viene conservata su questo dispositivo. Salva il post per ritrovarlo nella Libreria.' : 'La bozza resta disponibile quando cambi sezione. Salva prima di ricaricare o chiudere la pagina.'}</p></div>
          <IconHint label="Nuova foto"><button type="button" disabled={saving || generating} onClick={() => setReplacement({ id:null })} className="nav-icon border border-border" aria-label="Nuova foto"><Plus size={20} aria-hidden="true" /></button></IconHint>
        </div>
        {locked && <p className="border border-border rounded-xl p-4 mb-6 text-sm">{postStatus === 'pubblicato' ? 'Questo post è già pubblicato e viene mostrato in sola lettura.' : 'Il post è in invio automatico. Annulla l’invio dalla Libreria prima di modificarlo.'} <Link to="/library" className="text-purple underline">Apri Libreria</Link></p>}
        {planningSummary}
        <fieldset disabled={saving || generating || loading || locked} className="grid lg:grid-cols-[minmax(0,1fr)_400px] gap-6 min-w-0">
          <section className="min-w-0"><h2 className="font-heading text-xl mb-4">Foto e ritocco</h2>
            <PhotoEditor ref={editorRef} disabled={saving || generating || loading || locked} imageUrl={(mode === 'creative' || mode === 'enhance') && copy?.graphic_url ? copy.graphic_url : originalUrl} headline={design || mode === 'original' || !copy?.graphic_url ? copy?.headline || null : null} subtitle={copy?.graphic_subtitle || ''} design={design} filters={filters} activePreset={activePreset} onFiltersChange={setFilters} onPresetChange={setActivePreset} />
          </section>
          <aside data-tour="studio-copy" className="space-y-6 min-w-0">
            {design ? <><TemplateSelector value={design} onChange={setDesign} disabled={saving || generating || locked} /><div className="space-y-2"><label htmlFor="studio-logo" className="text-sm font-medium">Variante del logo</label><select id="studio-logo" className="w-full min-h-11 rounded-md border border-input bg-background px-3 text-sm" value={design.logo_variant} onChange={e => setDesign({ ...design, logo_variant:e.target.value })}><option value="auto">Automatica in base al contrasto</option>{Object.entries(LOGO_VARIANTS).map(([key,label]) => <option key={key} value={key} disabled={!design.brand.logos[key].url}>{label}</option>)}</select></div><fieldset className="space-y-3"><legend className="text-sm font-medium mb-2">Inquadratura della foto</legend>{[['x','Ritaglio orizzontale'],['y','Ritaglio verticale']].map(([key,label]) => <div key={key}><label htmlFor={'crop-'+key} className="text-xs text-muted-foreground">{label}</label><input id={'crop-'+key} type="range" min="0" max="1" step="0.01" value={design.crop[key]} onChange={e => setDesign({ ...design, crop: { ...design.crop, [key]:Number(e.target.value) } })} className="w-full h-11" /></div>)}</fieldset>{!locked && <button type="button" data-tour="studio-brand-refresh" className="min-h-11 text-sm text-purple underline" onClick={refreshBrand}>Usa le impostazioni aziendali aggiornate</button>}</> : !locked && <div data-tour="studio-legacy" className="space-y-3 border border-border p-4 rounded-lg"><p className="text-sm">Questo post usa la composizione precedente. Puoi applicare un template alla foto originale per rendere modificabili testo e logo.</p><Button variant="outline" onClick={() => { setDesign(defaultDesign(me)); setMode('original'); setCopy({ ...copy, graphic_url:null }); }}>Applica un template alla foto originale</Button></div>}
            <div><h2 className="font-heading text-xl">Come sarà il post</h2><p className="text-xs text-muted-foreground mt-2">{isPro ? 'Piano Pro attivo' : 'Generazioni gratuite rimaste: ' + remaining + ' di 2'}</p></div>
            <CopyPanel platform={platform} setPlatform={setPlatform} tone={tone} setTone={setTone} context={context} setContext={setContext} mode={mode} setMode={setMode} onGenerate={generate} generating={generating} copy={copy} setCopy={setCopy} aiAvailable={!!settings.aiEnabled && (mode === 'original' || !!settings.imageAIEnabled)} canGenerate={canGenerate && !locked} templateMode={!!design} fromPlanning={!!planning} />
            <div data-tour="studio-title" className="pt-5 border-t border-border space-y-2"><label htmlFor="post-title" className="text-sm font-medium">Titolo nella Libreria</label><Input id="post-title" value={title} onChange={e => setTitle(e.target.value)} maxLength={200} disabled={generating} placeholder="Nome interno del contenuto" /></div>
            {!locked && <div className="space-y-2"><label htmlFor="post-status" className="text-sm font-medium">Stato del contenuto</label><select id="post-status" className="w-full rounded-md border border-input bg-background p-3 text-sm" value={postStatus} onChange={e => setPostStatus(e.target.value)} disabled={generating}><option value="bozza">Bozza</option><option value="pronto">Pronto per la pubblicazione</option></select></div>}
          </aside>
        </fieldset>
      </>}
    </main>
    <ConfirmAction open={!!replacement} onOpenChange={value => { if (!value) keepDraft(); }} title="Sostituire la bozza aperta?" description="Le modifiche non salvate della bozza attuale andranno perse. I post già salvati restano nella Libreria." confirmLabel={replacement?.id ? 'Apri il post scelto' : 'Scegli una nuova foto'} onConfirm={replaceDraft} />
  </div>;
}

