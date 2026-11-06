import { useI18n } from '@/lib/i18n';
import { translate as translateUI } from '@/lib/i18n';
import React from "react";
import { Link, Navigate } from "react-router-dom";
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
  useI18n();
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

export default function Landing() {
  useI18n();
  const { isAuthenticated, logout } = useAuth();
  if (isAuthenticated) return <Navigate to="/home" replace />;

  return (
    <div className="min-h-screen bg-background">
      <WorkspaceHeader subtitle="Home" showGuide={false} navigation={isAuthenticated ? null : <nav aria-label={translateUI("Esplora ClickSocial")} className="flex items-center gap-2">
        <IconHint label={translateUI("Come funziona")}><a href="#come-funziona" aria-label={translateUI("Come funziona")} className="nav-icon nav-labeled"><PanelsTopLeft size={20} aria-hidden="true" /><span>{translateUI("Come funziona")}</span></a></IconHint>
        <IconHint label={translateUI("Cosa ottieni")}><a href="#cosa-ottieni" aria-label={translateUI("Cosa ottieni")} className="nav-icon nav-labeled"><Images size={20} aria-hidden="true" /><span>{translateUI("Cosa ottieni")}</span></a></IconHint>
        <IconHint label={translateUI("Collega i profili")}><a href="#collega-profili" aria-label={translateUI("Collega i profili")} className="nav-icon nav-labeled"><Link2 size={20} aria-hidden="true" /><span>{translateUI("Collega i profili")}</span></a></IconHint>
      </nav>} actions={isAuthenticated
        ? <IconHint label={translateUI("Esci dall’account")}><button type="button" aria-label={translateUI("Esci dall’account")} className="nav-icon nav-labeled" onClick={() => logout(false).catch(error => toast.error(translateUI('Uscita non riuscita: ') + translateUI(error.message)))}><LogOut size={20} aria-hidden="true" /></button></IconHint>
        : <IconHint label={translateUI("Accedi")}><Link to="/login" aria-label={translateUI("Accedi")} className="nav-icon nav-labeled"><LogIn size={20} aria-hidden="true" /><span>{translateUI("Accedi")}</span></Link></IconHint>} />

      <main>
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="pointer-events-none absolute -top-40 -right-40 w-[540px] h-[540px] rounded-full bg-accent blur-3xl opacity-70" />
          <div aria-hidden="true" className="pointer-events-none absolute top-64 -left-52 w-[420px] h-[420px] rounded-full bg-pink/10 blur-3xl" />
          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-14 sm:py-20 grid lg:grid-cols-2 gap-14 lg:gap-8 items-center">
            <div>
              <div className="inline-flex items-center gap-3 rounded-full bg-card px-4 py-2 pwa-shadow text-xs font-medium">
                <span className="font-semibold text-purple">{translateUI("Creator workspace")}</span>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="text-muted-foreground">{translateUI("Grafica e testi per i tuoi social")}</span>
              </div>
              <h1 className="font-heading text-4xl sm:text-6xl font-bold tracking-tight leading-[1.02] mt-6">{translateUI("La tua foto.")}{' '}<br />{translateUI("Il tuo prossimo")}{' '}<em className="italic font-extrabold text-purple">{translateUI("post.")}</em>
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground mt-5 max-w-md leading-relaxed">{translateUI("Carica o scatta una foto e premi Genera: grafica, descrizione e hashtag sono pronti da controllare. Salva in bozze oppure pubblica sui social collegati, con il piano Pro. Le impostazioni sono facoltative.")}{' '}</p>
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <Link
                  to="/register"
                  data-tour="cta-primary"
                  className="rounded-full bg-purple text-white font-semibold px-7 py-3.5 hover:bg-purple-dark transition-colors"
                >{translateUI("Crea il primo post")}{' '}</Link>
                <Link to="/login" className="text-sm font-medium text-foreground underline-offset-4 hover:underline">{translateUI("Ho già un account")}{' '}</Link>
              </div>
              <div className="flex flex-wrap items-center gap-2.5 mt-9" aria-label={translateUI("Piattaforme supportate")}>
                <span className="text-xs text-muted-foreground mr-1">{translateUI("Crea per")}</span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-card px-3.5 py-1.5 text-xs font-semibold pwa-shadow">
                  <Instagram className="w-3.5 h-3.5 text-instagram" /> Instagram
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
          <p>{translateUI("Dalla foto al feed, con la grafica che resta tua.")}</p><HelpButton withLabel />
          <span>{translateUI("Realizzato da")}{' '}<a href="https://sodanoconsulting.it/" target="_blank" rel="noopener noreferrer" className="font-medium text-foreground underline underline-offset-4">Sodano Consulting S.R.L.</a>
          </span>
        </div>
      </footer>
    </div>
  );
}

