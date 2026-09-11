import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { api } from "@/api/client";
import { Plug, Loader2, Check, X } from "lucide-react";

export default function AiStatusCard() {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState(null);

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const res = await api.functions.invoke("aiStatus", {});
      setResult(res.data);
    } catch (e) {
      setResult({ ok: false, error: e?.response?.data?.error || e.message });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-muted-foreground">
          Verifica che il motore AI (generazione dei copy) risponda correttamente.
        </p>
        <Button onClick={runTest} disabled={testing} className="rounded-full shrink-0">
          {testing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Test in corso…
            </>
          ) : (
            <>
              <Plug className="w-4 h-4 mr-2" /> Testa connessione AI
            </>
          )}
        </Button>
      </div>
      {result && (
        <div
          className={
            "rounded-xl px-4 py-3 text-sm flex items-center gap-2 " +
            (result.ok ? "bg-accent text-foreground" : "bg-destructive/10 text-destructive")
          }
        >
          {result.ok ? (
            <>
              <Check className="w-4 h-4 text-purple shrink-0" /> Connessa · risposta in{" "}
              {result.latencyMs} ms
            </>
          ) : (
            <>
              <X className="w-4 h-4 shrink-0" /> Errore: {result.error}
            </>
          )}
        </div>
      )}
    </div>
  );
}