import { useI18n, translate as translateUI, languageLocale } from '@/lib/i18n';
import React from "react";
import { Clock, CheckCircle2, AlertCircle } from "lucide-react";

export default function PostStatusBadge({ post }) {
  useI18n();
  if (!post.status || ["pronto", "bozza"].includes(post.status)) return null;

  const when = post.scheduled_at
    ? new Date(post.scheduled_at).toLocaleString(languageLocale(), { dateStyle: "short", timeStyle: "short" })
    : "";

  if (post.status === "in_pubblicazione") return <span className="absolute bottom-3 left-3 bg-purple text-white px-3 py-1 text-sm">{translateUI("Pubblicazione in corso")}</span>;
  if (post.status === "da_verificare") return <span className="absolute bottom-3 left-3 max-w-[85%] bg-background text-foreground border border-border px-3 py-1 text-sm">{translateUI("Esito da verificare sul social")}</span>;

  if (post.status === "in_coda") {
    return (
      <span className="absolute bottom-3 left-3 max-w-[85%] px-2.5 py-1 rounded-full text-[11px] font-medium bg-purple text-white flex items-center gap-1.5">
        <Clock className="w-3 h-3 shrink-0" />
        <span className="truncate">{translateUI("In coda ·")} {when}</span>
      </span>
    );
  }
  if (post.status === "pubblicato") {
    return (
      <span className="absolute bottom-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-medium bg-cyan text-white flex items-center gap-1.5">
        <CheckCircle2 className="w-3 h-3 shrink-0" />{translateUI("Pubblicato")}</span>
    );
  }
  if (post.status === "fallito") {
    return (
      <span
        className="absolute bottom-3 left-3 max-w-[85%] px-2.5 py-1 rounded-full text-[11px] font-medium bg-destructive text-white flex items-center gap-1.5"
        title={post.schedule_error || translateUI("Pubblicazione non riuscita")}
      >
        <AlertCircle className="w-3 h-3 shrink-0" />{translateUI("Fallito")}</span>
    );
  }
  return null;
}
