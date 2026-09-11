import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import Logo from "@/components/Logo";
import { PhoneMockup } from "@/components/landing/HeroStage";

const AUTH_FEED_IMG =
  "/assets/891b6e05f_generated_image.png";

const THEMES = {
  purple: {
    panel: "bg-gradient-to-br from-purple via-purple-dark to-ink",
  },
  pink: {
    panel: "bg-gradient-to-br from-pink via-purple to-purple-dark",
  },
};

export default function SplitAuth({ theme = "purple", label, title, text, children, footer = null }) {
  return (
    <div className="min-h-screen bg-background grid lg:grid-cols-2">
      <section
        aria-label="ClickSocial"
        className={`relative hidden lg:flex flex-col justify-between overflow-hidden p-10 ${THEMES[theme].panel}`}
      >
        <div aria-hidden="true" className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-white/10 blur-2xl" />
        <Link to="/" aria-label="ClickSocial, home" className="relative inline-flex items-center gap-2 font-heading text-lg font-bold tracking-tight">
          <Logo />
          <span>
            <span className="text-white/70 font-medium">Click</span>
            <strong className="text-white">Social</strong>
          </span>
        </Link>
        <div className="relative max-w-md">
          <p className="text-xs font-semibold uppercase tracking-widest text-white/70">{label}</p>
          <h1 className="font-heading text-4xl font-bold text-white leading-tight mt-3">{title}</h1>
          <p className="text-white/70 mt-4 leading-relaxed">{text}</p>
        </div>
        <div className="relative mx-auto w-[260px] sm:w-[296px]">
          <PhoneMockup
            image={AUTH_FEED_IMG}
            caption="“Il tuo brand, ogni mattina.”"
          />
        </div>
      </section>

      <section className="flex flex-col justify-center px-5 sm:px-10 lg:px-16 py-10 min-h-screen safe-top safe-bottom">
        <div className="w-full max-w-md mx-auto">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft className="w-4 h-4" /> Torna alla home
          </Link>
          <div className="mb-8 lg:hidden">
            <span className="font-heading text-lg font-bold tracking-tight">
              <span className="font-medium text-foreground/70">Click</span>
              <strong className="text-foreground">Social</strong>
            </span>
          </div>
          {children}
          {footer && <div className="text-sm text-muted-foreground mt-8">{footer}</div>}
        </div>
      </section>
    </div>
  );
}