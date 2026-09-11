import React, { useId, useRef, useState } from "react";
import { api } from "@/api/client";
import { Image } from "@/components/ui/image";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, UploadCloud, X } from "lucide-react";

// Il logo viene salvato nel profilo e applicato alle grafiche Enhance e Creative.
export default function LogoUpload({ logoUrl, onChange }) {
  const inputId = useId();
  const limitsId = inputId + '-limits';
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || uploading) return;
    if (!['image/jpeg','image/png','image/webp','image/gif'].includes(file.type) || !file.size || file.size > 15*1024*1024) {
      toast.error("Usa un logo JPEG, PNG, WebP o GIF, fino a 15 MB.");
      return;
    }
    setUploading(true);
    try {
      const { file_url } = await api.integrations.Core.UploadFile({ file });
      onChange(file_url);
      toast.success("Logo caricato");
    } catch (err) {
      toast.error("Caricamento logo non riuscito");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-2">
      <Label htmlFor={inputId}>Logo aziendale (opzionale)</Label>
      <p id={limitsId} className="text-xs text-muted-foreground">JPEG, PNG, WebP o GIF, massimo 15 MB.</p>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <div className="relative">
            <Image
              src={logoUrl}
              alt="Logo aziendale"
              fittingType="fit"
              className="w-16 h-16 rounded-2xl border border-border bg-card p-1.5"
            />
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={uploading}
              className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow"
              aria-label="Rimuovi logo"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="w-16 h-16 rounded-2xl border-2 border-dashed border-border bg-card flex items-center justify-center text-muted-foreground hover:border-purple/50 transition-colors"
            aria-label="Carica logo"
            aria-describedby={limitsId}
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <UploadCloud className="w-5 h-5" />
            )}
          </button>
        )}
        <div className="flex-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            aria-describedby={limitsId}
            className="text-sm font-medium text-purple hover:underline disabled:opacity-50"
          >
            {uploading ? "Caricamento…" : logoUrl ? "Sostituisci logo" : "Carica un logo"}
          </button>
          <p className="text-xs text-muted-foreground mt-1">
            Nelle nuove grafiche Enhance e Creative il fondo uniforme bianco o nero viene rimosso automaticamente. L’AI individua lo spazio per il logo e l’app controlla che non copra le aree rilevate come importanti. Il marchio conserva colori e proporzioni.
          </p>
        </div>
      </div>
      <input
        id={inputId}
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        aria-describedby={limitsId}
        disabled={uploading}
        onChange={handleFile}
        className="hidden"
      />
    </div>
  );
}
