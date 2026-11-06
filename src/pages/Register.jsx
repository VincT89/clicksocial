import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import React, { useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import SplitAuth from "@/components/auth/SplitAuth";
import GoogleIcon from "@/components/GoogleIcon";
import { toast } from "@/components/ui/use-toast";
import { safeReturnTo } from "@/lib/authReturnTo";

export default function Register() {
  useI18n();
  const { appPublicSettings } = useAuth();
  const localSettings = appPublicSettings?.public_settings || {};
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Le password non coincidono");
      return;
    }
    setLoading(true);
    try {
      await api.auth.register({ email, password });
      setShowOtp(true);
    } catch (err) {
      setError(err.message || "Registrazione non riuscita");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setError("");
    setLoading(true);
    try {
      await api.auth.verifyOtp({ email, otpCode });
      const returnTo = safeReturnTo();
      window.location.href = returnTo !== "/" ? returnTo : "/configura-azienda";
    } catch (err) {
      setError(err.message || "Codice non valido");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    try {
      await api.auth.resendOtp(email);
      toast({
        title: translateUI("Codice inviato"),
        description: translateUI(localSettings.localMail ? "Apri la posta locale per il nuovo codice." : "Controlla la tua email per il nuovo codice."),
      });
    } catch (err) {
      setError(err.message || "Invio non riuscito");
    }
  };

  const handleGoogle = async () => {
    try {
    await api.auth.loginWithProvider("google", safeReturnTo() !== "/" ? safeReturnTo() : "/configura-azienda");
    } catch (error) { setError(error.message); }
  };

  if (showOtp) {
    return (
      <SplitAuth
        theme="pink"
        label={translateUI("Il tuo archivio creativo")}
        title={translateUI("Verifica la tua email.")}
        text={translateUI(localSettings.localMail ? "Il codice per {email} si trova nella posta locale." : "Abbiamo inviato un codice a {email}.", { email })}
      >
        <h1 className="font-heading text-2xl font-bold tracking-tight">{translateUI("Inserisci il codice")}</h1>
        <p className="text-sm text-muted-foreground mt-1 mb-6">{translateUI("Sei a un passo dal tuo studio.")}{localSettings.localMail && <a href="/dev/mail" target="_blank" rel="noreferrer" className="underline">{translateUI("Apri posta locale")}</a>}
        </p>

        {error && (
          <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            {translateUI(error)}
          </div>
        )}
        <div className="flex justify-center mb-6">
          <InputOTP
            aria-label={translateUI("Codice di verifica")}
            maxLength={6}
            value={otpCode}
            onChange={setOtpCode}
            autoFocus
            autoComplete="one-time-code"
          >
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button
          className="w-full h-12 font-medium rounded-full"
          onClick={handleVerify}
          disabled={loading || otpCode.length < 6}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{translateUI("Verifica in corso…")}</>
          ) : (
            translateUI("Verifica e continua")
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">{translateUI("Non hai ricevuto il codice?")}{" "}
          <button onClick={handleResend} className="text-primary font-medium hover:underline">{translateUI("Invia di nuovo")}</button>
        </p>
      </SplitAuth>
    );
  }

  return (
    <SplitAuth
      theme="pink"
      label={translateUI("Il tuo archivio creativo")}
      title={translateUI("Uno spazio per le foto che meritano di diventare contenuti.")}
      text={translateUI("I social sono facoltativi. Per creare, salvare e scaricare basta il tuo account.")}
      footer={
        <>{translateUI("Hai già un account?")}{" "}
          <Link
            to={"/login" + (safeReturnTo() !== "/" ? "?returnTo=" + encodeURIComponent(safeReturnTo()) : "")}
            className="text-primary font-medium hover:underline"
          >{translateUI("Accedi")}</Link>
        </>
      }
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight">{translateUI("Registrati")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{translateUI("Crea il tuo spazio creativo.")}</p>
      {localSettings.firstAccountAdmin && <p className="text-sm text-muted-foreground mb-4">{translateUI("Il primo account verificato in questa installazione locale sarà amministratore.")}</p>}

      <Button
        variant="outline"
        className="w-full h-12 text-sm font-medium mb-6"
        onClick={handleGoogle}
        disabled={!localSettings.googleEnabled}
      >
        <GoogleIcon className="w-5 h-5 mr-2" />{translateUI("Continua con Google")}</Button>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-3 text-muted-foreground">{translateUI("oppure")}</span>
        </div>
      </div>

      {error && (
        <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {translateUI(error)}
        </div>
      )}

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
        <div className="space-y-2">
          <Label htmlFor="password">{translateUI("Password")}</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              minLength={10}
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{translateUI("Creazione in corso…")}</>
          ) : (
            translateUI("Continua con l'azienda")
          )}
        </Button>
      </form>
    </SplitAuth>
  );
}