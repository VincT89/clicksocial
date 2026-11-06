import { useI18n, languageLocale } from '@/lib/i18n';
import { translate as translateUI } from '@/lib/i18n';
import React from "react";
import { Button } from "@/components/ui/button";

import { Crown, Undo2 } from "lucide-react";

export default function CustomersTable({ users, onTogglePlan }) {
  useI18n();
  if (users === null) {
    return <p className="text-sm text-muted-foreground">{translateUI("Caricamento clienti…")}</p>;
  }
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">{translateUI("Nessun cliente registrato.")}</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-medium">{translateUI("Cliente")}</th>
            <th className="py-2 pr-4 font-medium">{translateUI("Azienda")}</th>
            <th className="py-2 pr-4 font-medium">{translateUI("Piano")}</th>
            <th className="py-2 pr-4 font-medium">{translateUI("Quota gratuita usata")}</th>
            <th className="py-2 pr-4 font-medium">{translateUI("Registrato")}</th>
            <th className="py-2 font-medium">{translateUI("Azione")}</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-border/60">
              <td className="py-3 pr-4 break-all">{u.email}</td>
              <td className="py-3 pr-4">{u.company_name || "—"}</td>
              <td className="py-3 pr-4">
                <span
                  className={
                    "rounded-full px-3 py-1 text-xs font-medium " +
                    (u.plan === "pro"
                      ? "bg-purple text-white"
                      : "bg-secondary text-foreground")
                  }
                >
                  {u.plan === "pro" ? "Pro" : translateUI("Gratuito")}
                </span>
              </td>
              <td className="py-3 pr-4">{u.ai_generations_used || 0}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {u.created_date ? new Date(u.created_date).toLocaleDateString(languageLocale()) : "—"}
              </td>
              <td className="py-3">
                {u.plan === "pro" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onTogglePlan(u.id, "free")}
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" />{' '}{translateUI("Riporta a Gratuito")}{' '}</Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => onTogglePlan(u.id, "pro")}
                  >
                    <Crown className="w-3.5 h-3.5 mr-1" />{' '}{translateUI("Attiva Pro")}{' '}</Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
