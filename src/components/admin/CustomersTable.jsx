import React from "react";
import { Button } from "@/components/ui/button";
import moment from "moment";
import { Crown, Undo2 } from "lucide-react";

export default function CustomersTable({ users, onTogglePlan }) {
  if (users === null) {
    return <p className="text-sm text-muted-foreground">Caricamento clienti…</p>;
  }
  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun cliente registrato.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground border-b border-border">
            <th className="py-2 pr-4 font-medium">Cliente</th>
            <th className="py-2 pr-4 font-medium">Azienda</th>
            <th className="py-2 pr-4 font-medium">Piano</th>
            <th className="py-2 pr-4 font-medium">Quota gratuita usata</th>
            <th className="py-2 pr-4 font-medium">Registrato</th>
            <th className="py-2 font-medium">Azione</th>
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
                  {u.plan === "pro" ? "Pro" : "Gratuito"}
                </span>
              </td>
              <td className="py-3 pr-4">{u.ai_generations_used || 0}</td>
              <td className="py-3 pr-4 whitespace-nowrap">
                {u.created_date ? moment(u.created_date).format("DD/MM/YYYY") : "—"}
              </td>
              <td className="py-3">
                {u.plan === "pro" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-full"
                    onClick={() => onTogglePlan(u.id, "free")}
                  >
                    <Undo2 className="w-3.5 h-3.5 mr-1" /> Riporta a Gratuito
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    className="rounded-full"
                    onClick={() => onTogglePlan(u.id, "pro")}
                  >
                    <Crown className="w-3.5 h-3.5 mr-1" /> Attiva Pro
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
