import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Loader2, AlertTriangle } from "lucide-react";
import SplitAuth from "@/components/auth/SplitAuth";

export default function ResetPassword() {
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
        label="Attenzione"
        title="Link non valido."
        text="Il link per reimpostare la password è mancante o scaduto."
        footer={
          <Link to="/forgot-password" className="text-primary font-medium hover:underline">
            Richiedi un nuovo link
          </Link>
        }
      >
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
          <p className="text-sm text-foreground leading-relaxed">
            Il link che hai usato risulta incompleto. Richiedi una nuova email per reimpostare la
            password.
          </p>
        </div>
      </SplitAuth>
    );
  }

  return (
    <SplitAuth
      theme="purple"
      label="Ultimo passaggio"
      title="Scegli la nuova password."
      text="Poi potrai rientrare nel tuo studio."
    >
      <h2 className="font-heading text-2xl font-bold tracking-tight">Nuova password</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">
        Inserisci la nuova password qui sotto.
      </p>

      {error && (
        <div className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Nuova password</Label>
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
          <Label htmlFor="confirm">Conferma password</Label>
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Reimpostazione…
            </>
          ) : (
            "Reimposta la password"
          )}
        </Button>
      </form>
    </SplitAuth>
  );
}