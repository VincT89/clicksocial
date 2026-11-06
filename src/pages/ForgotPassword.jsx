import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Loader2 } from "lucide-react";
import SplitAuth from "@/components/auth/SplitAuth";

export default function ForgotPassword() {
  useI18n();
  const { appPublicSettings } = useAuth();
  const localSettings = appPublicSettings?.public_settings || {};
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.auth.resetPasswordRequest(email);
      setSent(true);
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SplitAuth
      theme="purple"
      label={translateUI("Nessun problema")}
      title={translateUI("Reimposta la password.")}
      text={localSettings.localMail ? translateUI("Il link di recupero sarà disponibile nella posta locale.") : translateUI("Ti inviamo un link per scegliere una nuova password.")}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">{translateUI("Torna ad Accedi")}</Link>
      }
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight">{translateUI("Password dimenticata")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{translateUI("Inserisci l'email del tuo account.")}</p>

      {error && <p role="alert" className="text-destructive mb-4">{translateUI(error)}</p>}
      {sent ? (
        <p className="text-sm text-foreground leading-relaxed">
          {localSettings.localMail ? <>{translateUI("Se esiste un account verificato, il link è nella")} <a className="underline" href="/dev/mail" target="_blank" rel="noreferrer">{translateUI("posta locale")}</a>.</> : translateUI("Se esiste un account con questa email, riceverai un link per reimpostare la password.")}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">{translateUI("Email")}</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder={translateUI("nome@esempio.it")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="pl-10 h-12"
                required
              />
            </div>
          </div>
          <Button type="submit" className="w-full h-12 font-medium rounded-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />{translateUI("Invio in corso…")}</>
            ) : (
              translateUI("Invia il link")
            )}
          </Button>
        </form>
      )}
    </SplitAuth>
  );
}