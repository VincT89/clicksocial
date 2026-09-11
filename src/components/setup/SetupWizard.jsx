import React, { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/api/client";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import LogoUpload from "@/components/LogoUpload";

const FIELDS = [
  "Ristorazione",
  "Moda e stile",
  "Fitness e benessere",
  "Bellezza",
  "Tecnologia",
  "Viaggi",
  "Artigianato",
  "Altro",
];

const TONES = ["Ispirazionale", "Amichevole", "Professionale", "Ironico"];

const STEPS = [
  { tag: "Attività", title: "Come si chiama la tua attività?" },
  { tag: "Brand", title: "Raccontaci del tuo brand" },
  { tag: "Voce", title: "Che tono deve avere la voce del brand?" },
  { tag: "Riepilogo", title: "Tutto pronto" },
];

export default function SetupWizard() {
  const [params, setParams] = useSearchParams();
  const step = Math.max(0, Math.min(STEPS.length - 1, Math.floor(Number(params.get('step')) || 0)));
  const [saving, setSaving] = useState(false);

  // Ogni passo del wizard è una voce della cronologia: il back-gesture
  // (popstate) riporta al passo precedente invece di abbandonare la pagina.

  const goNext = () => {
    setParams({step:String(step+1)});
  };

  const [companyName, setCompanyName] = useState("");
  const [companyField, setCompanyField] = useState("");
  const [brandIdentity, setBrandIdentity] = useState("");
  const [toneVoice, setToneVoice] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  const canContinue =
    step === 0
      ? companyName.trim() && companyField
      : step === 1
        ? brandIdentity.trim().length > 0
        : step === 2
          ? toneVoice
          : true;

  const handleFinish = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe({
        company_name: companyName.trim(),
        company_field: companyField,
        brand_identity: brandIdentity.trim(),
        tone_of_voice: toneVoice,
        company_logo_url: logoUrl || "",
        setup_completed: true,
      });
      window.location.href = "/studio";
    } catch (e) {
      toast.error("Salvataggio non riuscito: " + (e?.message || ""));
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="flex items-center gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div
            key={s.tag}
            className={
              "h-1.5 flex-1 rounded-full transition-colors " +
              (i <= step ? "bg-purple" : "bg-border")
            }
          />
        ))}
      </div>

      <div className="rounded-[28px] bg-card p-6 sm:p-8 pwa-shadow">
        <span className="text-xs font-semibold uppercase tracking-widest text-purple">
          {STEPS[step].tag}
        </span>
        <h2 className="font-heading text-2xl font-bold tracking-tight mt-2">
          {STEPS[step].title}
        </h2>

        <div className="mt-6">
          {step === 0 && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="company">Nome dell'attività</Label>
                <Input
                  id="company"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Es. Sodano Consulting"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <div className="flex flex-wrap gap-2">
                  {FIELDS.map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCompanyField(f)}
                      className={
                        "rounded-full border px-4 py-2 text-sm font-medium transition-colors " +
                        (companyField === f
                          ? "border-purple bg-purple text-white"
                          : "border-border bg-card text-foreground hover:border-purple/50")
                      }
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>
              <LogoUpload logoUrl={logoUrl} onChange={setLogoUrl} />
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <Label htmlFor="brand">Valori, personalità e missione</Label>
              <Textarea
                id="brand"
                value={brandIdentity}
                onChange={(e) => setBrandIdentity(e.target.value)}
                placeholder="Es. Siamo uno studio creativo che aiuta le piccole imprese a raccontarsi con foto autentiche e testi semplici."
                className="min-h-32"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                L'AI userà queste informazioni per scrivere copy coerenti con il tuo brand.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-wrap gap-2">
              {TONES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setToneVoice(t)}
                  className={
                    "rounded-full border px-5 py-2.5 text-sm font-medium transition-colors " +
                    (toneVoice === t
                      ? "border-purple bg-purple text-white"
                      : "border-border bg-card text-foreground hover:border-purple/50")
                  }
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              {[
                ["Attività", companyName],
                ["Categoria", companyField],
                ["Brand", brandIdentity],
                ["Tone of voice", toneVoice],
              ].map(([k, v]) => (
                <div key={k} className="rounded-[16px] bg-secondary px-4 py-3">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    {k}
                  </span>
                  <p className="text-sm mt-0.5 whitespace-pre-wrap">{v}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between mt-8">
          {step > 0 ? (
            <Button
              variant="ghost"
              onClick={() => setParams({step:String(Math.max(0,step-1))})}
              disabled={saving}
              className="rounded-full"
            >
              <ArrowLeft className="w-4 h-4 mr-1" /> Indietro
            </Button>
          ) : (
            <span />
          )}
          {step < STEPS.length - 1 ? (
            <Button
              onClick={goNext}
              disabled={!canContinue}
              className="rounded-full"
            >
              Continua <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleFinish} disabled={saving} className="rounded-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Preparazione…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" /> Apri lo studio
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
