import { useI18n, translate as translateUI } from '@/lib/i18n';
import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import SplitAuth from "@/components/auth/SplitAuth";

export default function ResetPassword() {
  useI18n();
  const [searchParams] = useSearchParams();
  const resetToken = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setLoading(true);
    try {
      await api.auth.resetPassword({ resetToken, newPassword, email: searchParams.get("email") });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Reimpostazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  if (!resetToken) {
    return (
      <SplitAuth
        theme="purple"
        label={translateUI("Attenzione")}
        title={translateUI("Link non valido.")}
        text={translateUI("Il link per reimpostare la password è mancante o scaduto.")}
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">{translateUI("Richiedi un nuovo link")}</Link>
        }
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight mb-4">{translateUI("Link non valido.")}</h1>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">{translateUI("Il link che hai usato risulta incompleto. Richiedi una nuova email per reimpostare la password.")}</p>
        </div>
      </SplitAuth>
    );
  }

  return (
    <SplitAuth
      theme="purple"
      label={translateUI("Ultimo passaggio")}
      title={translateUI("Scegli la nuova password.")}
      text={translateUI("Poi potrai rientrare nel tuo studio.")}
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight">{translateUI("Nuova password")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{translateUI("Inserisci la nuova password qui sotto.")}</p>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {translateUI(error)}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">{translateUI("Nuova password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              minLength={10}
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">{translateUI("Conferma password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium rounded-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{translateUI("Reimpostazione…")}</>
          ) : (
            translateUI("Reimposta la password")
          )}
        </Button>
      </form>
    </SplitAuth>
  );
}