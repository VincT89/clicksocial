import React from "react";
import { Link } from "react-router-dom";
import HeroStage from "@/components/landing/HeroStage";
import { FlowSection, ConnectionsSection } from "@/components/landing/HomeSections";
import { Instagram, Facebook, Images, Link2, LogIn, LogOut, PanelsTopLeft } from "lucide-react";
import Logo from "@/components/Logo";
import WorkspaceHeader from "@/components/WorkspaceHeader";
import IconHint from "@/components/IconHint";
import { toast } from "sonner";
import HelpButton from "@/components/HelpButton";
import { useAuth } from "@/lib/AuthContext";

function Brand({ light = false }) {
  return (
    <span className="inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
      <Logo />
      <span>
        <span className={light ? "text-white/70" : "font-medium text-foreground/70"}>Click</span>
        <strong className={light ? "text-white" : "text-foreground"}>Social</strong>
      </span>
    </span>
  );
}

function TikTokMark({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-1.86-2.48V9.77a5.68 5.68 0 1 0 4.95 5.63V8.86a7.35 7.35 0 0 0 4.3 1.38V7.15a4.28 4.28 0 0 1-3.24-1.33z" />
    </svg>
  );
}

export default function Landing() {
  const { isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader subtitle="Home" navigation={isAuthenticated ? null : <nav aria-label="Esplora ClickSocial" className="flex items-center gap-2">
        <IconHint label="Come funziona"><a href="#come-funziona" aria-label="Come funziona" className="nav-icon"><PanelsTopLeft size={20} aria-hidden="true" /></a></IconHint>
        <IconHint label="Cosa ottieni"><a href="#cosa-ottieni" aria-label="Cosa ottieni" className="nav-icon"><Images size={20} aria-hidden="true" /></a></IconHint>
        <IconHint label="Collega i profili"><a href="#collega-profili" aria-label="Collega i profili" className="nav-icon"><Link2 size={20} aria-hidden="true" /></a></IconHint>
      </nav>} actions={isAuthenticated
        ? <IconHint label="Esci dall’account"><button type="button" aria-label="Esci dall’account" className="nav-icon" onClick={() => logout(false).catch(error => toast.error('Uscita non riuscita: ' + error.message))}><LogOut size={20} aria-hidden="true" /></button></IconHint>
        : <IconHint label="Accedi"><Link to="/login" aria-label="Accedi" className="nav-icon"><LogIn size={20} aria-hidden="true" /></Link></IconHint>} />

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 w-[540px] h-[540px] rounded-full bg-accent blur-3xl opacity-70" />
          <div aria-hidden="true" className="pointer-events-none absolute top-64 -left-52 w-[420px] h-[420px] rounded-full bg-pink/10 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-14 lg:gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-card px-4 py-2 pwa-shadow text-xs font-medium">
                <span className="font-semibold text-purple">Creator workspace</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">Foto, copy e grafica insieme</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02] mt-6">
                La tua foto.
                <br />
                Il tuo prossimo <em className="italic font-extrabold text-purple">post.</em>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-md leading-relaxed">
                Carica uno scatto, dagli il taglio giusto e costruisci un contenuto pronto per il
                feed. Scaricalo oppure, con Pro, invia e programma le foto su Facebook, Instagram e TikTok collegati e attivati dal gestore.
              </p>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Link
                  to="/register"
                  data-tour="cta-primary"
                  className="rounded-full bg-purple text-white font-semibold px-7 py-3.5 hover:bg-purple-dark transition-colors"
                >
                  Crea il primo post
                </Link>
                <Link to="/login" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">
                  Ho già un account
                </Link>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-9" aria-label="Piattaforme supportate">
                <span className="text-xs text-muted-foreground mr-1">Crea per</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold pwa-shadow">
                  <Instagram className="w-3.5 h-3.5 text-instagram" /> Instagram
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold pwa-shadow">
                  <TikTokMark className="w-3.5 h-3.5" /> TikTok
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold pwa-shadow">
                  <Facebook className="w-3.5 h-3.5 text-facebook" /> Facebook
                </span>
              </div>
            </div>
            <div className="w-full max-w-md mx-auto lg:max-w-none lg:pl-10" data-tour="hero-mockup">
              <HeroStage />
            </div>
          </div>
        </section>

        <div className="max-w-6xl mx-auto px-5 sm:px-8 pb-20 sm:pb-28 space-y-14 sm:space-y-20">
          <FlowSection />
          <ConnectionsSection />
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-muted-foreground">
          <Brand />
          <p>Dalla foto al feed, con la grafica che resta tua.</p><HelpButton withLabel />
          <span>
            Realizzato da <span className="font-medium text-foreground">Sodano Consulting S.R.L.</span>
          </span>
        </div>
      </footer>
    </div>
  );
}

