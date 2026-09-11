import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { formatAiCost } from '@/lib/aiCosts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AiSummaryTable({ rows }) {
  const [search, setSearch] = useState("");
  const [plan, setPlan] = useState("all");

  const plans = useMemo(() => {
    const set = new Set();
    (rows || []).forEach((r) => { if (r.plan && r.plan !== "—") set.add(r.plan); });
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (plan !== "all" && (r.plan || "—") !== plan) return false;
      if (q) {
        const hay = `${r.email || ""} ${r.company || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [rows, search, plan]);

  if (!rows || rows.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessun consumo AI registrato per i clienti in questo database.</p>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per cliente o azienda"
            aria-label="Cerca per cliente o azienda"
            className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={plan} onValueChange={setPlan}>
          <SelectTrigger className="sm:w-40" aria-label="Filtra clienti per piano">
            <SelectValue placeholder="Piano" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutti i piani</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="block sm:table w-full text-sm">
          <thead className="hidden sm:table-header-group">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Azienda</th>
              <th className="py-2 pr-4 font-medium">Piano</th>
              <th className="py-2 pr-4 font-medium">Operazioni</th>
              <th className="py-2 pr-4 font-medium">Token</th>
              <th className="py-2 font-medium">Stima USD</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-6 text-center text-sm text-muted-foreground">
                  Nessun cliente corrisponde ai filtri.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="grid grid-cols-2 gap-x-4 gap-y-3 sm:table-row py-4 sm:py-0 border-b border-border/60">
                  <td className="col-span-2 sm:py-3 sm:pr-4 break-words font-medium sm:font-normal">{r.email}</td>
                  <td className="col-span-2 sm:py-3 sm:pr-4">{r.company || "—"}</td>
                  <td className="sm:py-3 sm:pr-4"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Piano</span>{r.plan || "—"}</td>
                  <td className="sm:py-3 sm:pr-4"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Operazioni</span>{r.calls}</td>
                  <td className="sm:py-3 sm:pr-4"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Token</span>{r.tokens.toLocaleString('it-IT')}{r.incompleteTokens > 0 && <p className="text-xs text-muted-foreground">Parziali</p>}</td>
                  <td className="sm:py-3 tabular-nums sm:whitespace-nowrap [overflow-wrap:anywhere]"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Stima USD</span>{formatAiCost(r.cost)}{r.cost?.incomplete_count > 0 && <p className="text-xs text-muted-foreground whitespace-normal">{r.cost.status === 'partial' ? 'Subtotale · ' : ''}{r.cost.incomplete_count}{r.cost.incomplete_count === 1 ? ' operazione con costi incompleti' : ' operazioni con costi incompleti'}</p>}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {filtered.length} di {rows.length} clienti mostrati.
      </p>
    </div>
  );
}
