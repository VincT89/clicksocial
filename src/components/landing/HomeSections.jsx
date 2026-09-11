import React from "react";
import { Link } from "react-router-dom";
import { Camera, Compass, Send, ShieldCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const FLOW = [
  {
    tag: "Foto",
    title: "Carica e ritocca",
    text: "Filtri, luce e atmosfera nello stesso riquadro.",
    icon: Camera,
  },
  {
    tag: "Direzione",
    title: "Scegli voce, social e modalità",
    text: "Scrivi il testo oppure usa l'AI, quando configurata, per generare caption e hashtag.",
    icon: Compass,
  },
  {
    tag: "Output",
    title: "Pubblica dove vuoi",
    text: "Scarica foto e testo. Con il piano Pro puoi programmare i post per una Pagina Facebook collegata.",
    icon: Send,
  },
];

const STEPS = [
  { title: "Apri il tuo profilo", text: "Entra nella sezione dedicata ai collegamenti social." },
  { title: "Scegli il social", text: "Premi il pulsante per collegare la tua Pagina Facebook." },
  { title: "Accedi e autorizza", text: "Effettua l'accesso su Meta e seleziona la tua Pagina Facebook." },
  { title: "Crea e pubblica", text: "Scegli le destinazioni direttamente quando il post è pronto." },
];

export function FlowSection() {
  return (
    <section id="come-funziona" data-tour="flow" className="scroll-mt-20">
      <div className="text-center mb-10">
        <span className="text-xs font-semibold uppercase tracking-widest text-purple">Un flusso semplice</span>
        <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-2">
          Dalla foto al feed, senza cambiare strumento.
        </h2>
      </div>
      <div id="cosa-ottieni" className="grid md:grid-cols-3 gap-5 scroll-mt-20">
        {FLOW.map((f) => (
          <article key={f.title} className="rounded-[20px] bg-card p-6 pwa-shadow">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
                <f.icon className="w-5 h-5 text-purple" />
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{f.tag}</span>
            </div>
            <h3 className="font-heading text-lg font-bold">{f.title}</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{f.text}</p>
          </article>
        ))}
      </div>
      <aside className="mt-5 rounded-[20px] bg-foreground text-background p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex-1">
          <strong className="font-heading text-lg">I tuoi profili restano sotto il tuo controllo.</strong>
          <p className="text-sm text-background/70 mt-1">
            Collegali in pochi clic oppure continua a pubblicare manualmente.
          </p>
        </div>
        <Link
          to="/register"
          className="inline-flex justify-center rounded-full bg-background text-foreground text-sm font-semibold px-6 py-3 hover:bg-background/90 transition-colors"
        >
          Crea il tuo spazio
        </Link>
      </aside>
    </section>
  );
}

export function ConnectionsSection() {
  const { appPublicSettings } = useAuth();
  const facebookEnabled = appPublicSettings?.public_settings?.facebookEnabled;
  return (
    <section id="collega-profili" data-tour="connections" className="rounded-[28px] bg-card p-6 sm:p-10 pwa-shadow scroll-mt-20">
      <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <span className="text-xs font-semibold uppercase tracking-widest text-purple">
            Collegamento semplice e sicuro
          </span>
          <h2 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mt-2 leading-tight">
            I tuoi profili business, pronti quando vuoi pubblicare.
          </h2>
          <div className="mt-5 space-y-3 text-sm text-muted-foreground leading-relaxed">
            <p>
              Collega la tua Pagina Facebook dal tuo profilo ClickSocial usando il normale accesso
              di Meta. Scegli tu quale account autorizzare.
            </p>
            <p className="text-foreground font-semibold">
              {facebookEnabled ? "Il collegamento Facebook è attivo per questa installazione." : "Il collegamento Facebook deve essere attivato dall'amministratore."}
            </p>
            <p className="flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-cyan mt-0.5 shrink-0" />
              La password Facebook viene inserita soltanto sul sito di Meta, mai su ClickSocial.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-8">
            {STEPS.map((s, i) => (
              <article key={s.title} className="rounded-[16px] bg-secondary p-4">
                <span className="text-[11px] font-bold text-purple">0{i + 1}</span>
                <h3 className="font-semibold text-sm mt-1">{s.title}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{s.text}</p>
              </article>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-4">
          <article className="rounded-[20px] bg-facebook/5 border border-facebook/20 p-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-facebook">Meta</span>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-facebook/10 text-facebook">
                {facebookEnabled ? "Disponibile" : "Da configurare"}
              </span>
            </div>
            <h3 className="font-heading text-lg font-bold mt-2">Pagina Facebook</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Un solo collegamento per scegliere la Pagina Facebook che vuoi usare per la
              pubblicazione programmata dei tuoi post.
            </p>
          </article>
          <article className="rounded-[20px] bg-tiktok/5 border border-tiktok/20 p-6">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider">TikTok</span>
              <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-foreground/10">
                Pubblicazione manuale
              </span>
            </div>
            <h3 className="font-heading text-lg font-bold mt-2">TikTok</h3>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              Puoi creare i contenuti per TikTok e Instagram e pubblicarli manualmente scaricandoli dalla libreria. Il collegamento diretto non è incluso.
            </p>
          </article>
          <p className="text-xs text-muted-foreground">
            Puoi scollegare un profilo e revocare l'autorizzazione quando vuoi.
          </p>
        </div>
      </div>
    </section>
  );
}
