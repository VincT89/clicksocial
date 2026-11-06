import { useI18n, translate as translateUI } from '@/lib/i18n';
import { useAuth } from '@/lib/AuthContext';
import React, { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, Loader2 } from "lucide-react";
import SplitAuth from "@/components/auth/SplitAuth";
import GoogleIcon from "@/components/GoogleIcon";
import { safeReturnTo } from "@/lib/authReturnTo";
import { isNativeIOS } from "@/lib/mobile";

export default function Login() {
  useI18n();
  const { appPublicSettings } = useAuth();
  const localSettings = appPublicSettings?.public_settings || {};
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const passwordRef = useRef(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  // Post-login destination (e.g. the MCP OAuth consent page sends users here
  // with returnTo so the grant flow can resume). Same-origin paths only.
  const returnTo = safeReturnTo();
  const dest = returnTo !== "/" ? returnTo : "/home";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api.auth.loginViaEmailPassword(email, password);
      window.location.href = dest;
    } catch (err) {
      setError(err.message || "Email o password non validi");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    try {
    await api.auth.loginWithProvider("google", dest);
    } catch (error) { setError(error.message); }
  };

  return (
    <SplitAuth
      theme="purple"
      label={translateUI("Bentornato")}
      title={translateUI("Riprendi da dove avevi lasciato.")}
      text={translateUI("Le tue bozze, i tuoi scatti e le tue idee sono ancora al loro posto.")}
      footer={
        <>{translateUI("Non hai un account?")}{" "}
          <Link
            to={"/register" + (returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "")}
            className="text-primary font-medium hover:underline"
          >{translateUI("Crea uno spazio")}</Link>
        </>
      }
    >
      <h1 className="font-heading text-2xl font-bold tracking-tight">{translateUI("Accedi")}</h1>
      <p className="text-sm text-muted-foreground mt-1 mb-6">{translateUI("Entra nel tuo studio.")}</p>

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
              autoComplete="username"
              autoCapitalize="none"
              spellCheck={false}
              autoFocus={!isNativeIOS}
              enterKeyHint={isNativeIOS ? "next" : undefined}
              onKeyDown={(event) => {
                if (isNativeIOS && event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  passwordRef.current?.focus();
                }
              }}
              placeholder={translateUI("nome@esempio.it")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">{translateUI("Password")}</Label>
            <Link to="/forgot-password" className="text-xs text-primary hover:underline">{translateUI("Password dimenticata?")}</Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              ref={passwordRef}
              type="password"
              autoComplete="current-password"
              enterKeyHint="go"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium rounded-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />{translateUI("Accesso in corso…")}</>
          ) : (
            translateUI("Accedi")
          )}
        </Button>
      </form>
    </SplitAuth>
  );
}
