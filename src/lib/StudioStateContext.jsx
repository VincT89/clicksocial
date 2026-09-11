import React, { createContext, useContext, useState, useRef, useEffect } from "react";
import { DEFAULT_FILTERS } from "@/components/studio/PhotoEditor";
import { isNative, apiOrigin } from './mobile';
import { useAuth } from './AuthContext';
import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { restoreStudioDraft, draftStorageKey } from './studioDraft.mjs';
import { toast } from 'sonner';

// Stato globale dello Studio: preserva la bozza attiva (foto, copy, filtri)
// quando l'utente cambia tab dalla barra di navigazione mobile e poi torna.
const StudioStateContext = createContext(null);

export function StudioStateProvider({ children }) {
  const { user } = useAuth();
  const storageKey = user?.id ? draftStorageKey(apiOrigin, user.id) : '';
  const [hydratedKey, setHydratedKey] = useState('');
  const ready = !isNative || !storageKey || hydratedKey === storageKey;
  const latestDraft = useRef(null);
  const storageQueue = useRef(Promise.resolve());
  const storageWarning = useRef(false);
  const draftRevision = useRef(0);
  const [originalUrl, setOriginalUrl] = useState(null);
  const [platform, setPlatform] = useState("Instagram");
  const [tone, setTone] = useState("amichevole");
  const [mode, setMode] = useState("original");
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState('post');
  const [copy, setCopy] = useState(null);
  const [filters, setFilters] = useState({ ...DEFAULT_FILTERS });
  const [activePreset, setActivePreset] = useState("Originale");
  const [editingId, setEditingId] = useState(null);
  const [postStatus, setPostStatus] = useState('bozza');

  const persist = record => {
    if (!record?.key) return;
    storageQueue.current = storageQueue.current.catch(() => {}).then(() => record.data.originalUrl
      ? Preferences.set({ key: record.key, value: JSON.stringify({ version: 1, ...record.data }) })
      : Preferences.remove({ key: record.key })).catch(() => {
      if (!storageWarning.current) toast.error('Non riesco a conservare la bozza sul dispositivo. Salva il post nella Libreria prima di chiudere.');
      storageWarning.current = true;
    });
  };

  useEffect(() => {
    if (!isNative || !storageKey) return;
    let active = true;
    persist(latestDraft.current);
    latestDraft.current = null;
    draftRevision.current++;
    setOriginalUrl(null); setPlatform('Instagram'); setTone('amichevole'); setMode('original');
    setTitle(''); setContext(''); setCopy(null); setFilters({ ...DEFAULT_FILTERS });
    setActivePreset('Originale'); setEditingId(null); setPostStatus('bozza'); setGenerating(false);
    storageQueue.current.then(() => Preferences.get({ key: storageKey })).then(({ value }) => {
      if (!active) return;
      const saved = restoreStudioDraft(value, DEFAULT_FILTERS);
      if (saved) {
        setOriginalUrl(saved.originalUrl); setPlatform(saved.platform); setTone(saved.tone); setMode(saved.mode);
        setTitle(saved.title); setContext(saved.context); setCopy(saved.copy); setFilters(saved.filters);
        setActivePreset(saved.activePreset); setEditingId(saved.editingId); setPostStatus(saved.postStatus);
      }
    }).catch(() => toast.error('Non riesco a recuperare la bozza sul dispositivo.')).finally(() => { if (active) setHydratedKey(storageKey); });
    return () => { active = false; };
  }, [storageKey]);

  useEffect(() => {
    if (!isNative || !ready || !storageKey) return;
    const record = { key: storageKey, data: { originalUrl, platform, tone, mode, title, context, copy, filters, activePreset, editingId, postStatus } };
    latestDraft.current = record;
    const timer = setTimeout(() => persist(record), 200);
    return () => clearTimeout(timer);
  }, [ready, storageKey, originalUrl, platform, tone, mode, title, context, copy, filters, activePreset, editingId, postStatus]);

  useEffect(() => {
    if (!isNative) return;
    const listener = App.addListener('pause', () => persist(latestDraft.current));
    return () => { persist(latestDraft.current); listener.then(value => value.remove()); };
  }, []);

  const resetDraft = () => {
    draftRevision.current++;
    setOriginalUrl(null);
    setCopy(null);
    setMode("original");
    setTitle("");
    setContext("");
    setGenerating(false);
    setFilters({ ...DEFAULT_FILTERS });
    setActivePreset("Originale");
    setEditingId(null);
    setPostStatus('bozza');
  };

  return (
    <StudioStateContext.Provider
      value={{
        originalUrl,
        setOriginalUrl,
        platform,
        setPlatform,
        tone,
        setTone,
        mode,
        setMode,
        title,
        setTitle,
        context,
        setContext,
        generating,
        setGenerating,
        generationStage,
        setGenerationStage,
        copy,
        setCopy,
        filters,
        setFilters,
        activePreset,
        setActivePreset,
        editingId,
        setEditingId,
        resetDraft,
        draftRevision,
        postStatus,
        setPostStatus,
      }}
    >
      {ready ? children : <p role="status" className="p-6 text-sm text-muted-foreground">Recupero della bozza…</p>}
    </StudioStateContext.Provider>
  );
}

export function useStudioState() {
  const ctx = useContext(StudioStateContext);
  if (!ctx) {
    throw new Error("useStudioState deve essere usato dentro StudioStateProvider");
  }
  return ctx;
}
