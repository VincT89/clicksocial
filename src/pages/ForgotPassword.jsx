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
      label="Nessun problema"
      title="Reimposta la password."
      text={localSettings.localMail ? "Il link di recupero sarà disponibile nella posta locale." : "Ti inviamo un link per scegliere una nuova password."}
      footer={
        <Link to="/login" className="text-primary font-medium hover:underline">
          Torna ad Accedi
        </Link>
      }
    >
      <h2 className="font-heading text-2xl font-bold tracking-tight">Password dimenticata</h2>
      <p className="text-sm text-muted-foreground mt-1 mb-6">Inserisci l'email del tuo account.</p>

      {error && <p role="alert" className="text-destructive mb-4">{error}</p>}
      {sent ? (
        <p className="text-sm text-foreground leading-relaxed">
          {localSettings.localMail ? <>Se esiste un account verificato, il link è nella <a className="underline" href="/dev/mail" target="_blank" rel="noreferrer">posta locale</a>.</> : 'Se esiste un account con questa email, riceverai un link per reimpostare la password.'}
        </p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="nome@esempio.it"
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
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Invio in corso…
              </>
            ) : (
              "Invia il link"
            )}
          </Button>
        </form>
      )}
    </SplitAuth>
  );
}