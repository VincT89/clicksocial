import React, { useMemo, useState } from "react";
import moment from "moment";
import { Image as ImageIcon, Search } from "lucide-react";
import { aiTokenUsage, formatAiCost } from '@/lib/aiCosts';
import AiCostDetails from './AiCostDetails';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const OPERATIONS = ["generateCopy", "aiStatus"];
const PLATFORMS = ["instagram", "facebook", "tiktok"];
const operationNames = { generateCopy: 'Generazione post', aiStatus: 'Test connessione' };

export default function AiLogsTable({ logs }) {
  const [search, setSearch] = useState("");
  const [operation, setOperation] = useState("all");
  const [platform, setPlatform] = useState("all");

  const filtered = useMemo(() => {
    if (!logs) return [];
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (operation !== "all" && l.operation !== operation) return false;
      if (platform !== "all" && (l.platform || "") !== platform) return false;
      if (q) {
        const hay = `${l.user_email || ""} ${l.operation || ""} ${operationNames[l.operation] || ''} ${l.company_name || ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, search, operation, platform]);

  if (!logs || logs.length === 0) {
    return <p className="text-sm text-muted-foreground">Nessuna chiamata AI registrata.</p>;
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cerca per utente, azienda o operazione"
            aria-label="Cerca nello storico AI"
            className="w-full h-9 rounded-md border border-input bg-transparent pl-9 pr-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
        <Select value={operation} onValueChange={setOperation}>
          <SelectTrigger className="sm:w-44" aria-label="Filtra per operazione">
            <SelectValue placeholder="Operazione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le operazioni</SelectItem>
            {OPERATIONS.map((o) => (
              <SelectItem key={o} value={o}>{operationNames[o]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={platform} onValueChange={setPlatform}>
          <SelectTrigger className="sm:w-40" aria-label="Filtra per piattaforma">
            <SelectValue placeholder="Piattaforma" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tutte le piattaforme</SelectItem>
            {PLATFORMS.map((p) => (
              <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-x-auto">
        <table className="block sm:table w-full text-sm">
          <thead className="hidden sm:table-header-group">
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="py-2 pr-4 font-medium">Operazione</th>
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Token</th>
              <th className="py-2 font-medium">Stima USD</th>
            </tr>
          </thead>
          <tbody className="block sm:table-row-group">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-6 text-center text-sm text-muted-foreground">
                  Nessuna chiamata corrisponde ai filtri.
                </td>
              </tr>
            ) : (
              filtered.map((l) => {
                const usage = aiTokenUsage(l);
                return (
                  <React.Fragment key={l.id}><tr className="grid grid-cols-2 gap-x-4 gap-y-3 sm:table-row pt-4 sm:pt-0">
                    <td className="col-span-2 sm:py-3 sm:pr-4 align-top">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{operationNames[l.operation] || l.operation}</span>
                        {l.image_generated && (
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{l.status === 'error' ? 'Errore' : 'Completata'} · {l.model || 'Modello non registrato'}{l.image_model ? ' / ' + l.image_model : ''}</p>
                      {l.logo_placement && <p className="text-xs text-muted-foreground">Include l’analisi per il posizionamento del logo.</p>}
                      {l.error && <p className="text-xs text-destructive max-w-xs break-words">{l.error}</p>}
                      <div className="text-xs text-muted-foreground">
                        {l.created_date ? moment(l.created_date).format("DD/MM/YYYY HH:mm") : "—"}
                      </div>
                    </td>
                    <td className="col-span-2 sm:py-3 sm:pr-4 align-top break-words">{l.user_email || "—"}</td>
                    <td className="sm:py-3 sm:pr-4 align-top"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Token</span>{usage.value === null ? 'Non comunicati' : usage.value.toLocaleString('it-IT')}{!usage.complete && usage.value !== null && <p className="text-xs text-muted-foreground">Parziali</p>}</td>
                    <td className="sm:py-3 align-top sm:whitespace-nowrap tabular-nums [overflow-wrap:anywhere]"><span className="block sm:hidden text-xs text-muted-foreground mb-1">Stima USD</span>{formatAiCost(l.cost)}{l.cost?.status === 'partial' && <p className="text-xs text-muted-foreground">Subtotale</p>}</td>
                  </tr><tr className="block sm:table-row border-b border-border/60"><td colSpan={4} className="block sm:table-cell pt-2 sm:pt-0 pb-3"><AiCostDetails log={l} /></td></tr></React.Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground mt-3">
        {filtered.length} di {logs.length} operazioni mostrate.
      </p>
    </div>
  );
}
