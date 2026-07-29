import { Link } from "@tanstack/react-router";
import { AlertTriangle } from "lucide-react";
import type { Quote } from "@/lib/medical/types";
import { ownerById } from "@/lib/medical/mock-data";
import { formatBRL, quoteTotals } from "@/lib/medical/pricing";
import { PriorityBadge, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";

export function ExceptionsTable({ quotes }: { quotes: Quote[] }) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card card-shadow">
      <div className="flex items-center justify-between border-b bg-danger/5 px-3 py-2">
        <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-danger">
          <AlertTriangle className="h-3.5 w-3.5" /> Cotações que exigem ação agora ({quotes.length})
        </h3>
      </div>
      {quotes.length === 0 ? (
        <div className="p-6 text-center text-xs text-muted-foreground">
          Nenhuma cotação em risco. Time no verde.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="border-b bg-muted/20 text-[10px] uppercase text-muted-foreground">
              <tr>
                <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                <th className="px-2 py-2 text-left font-semibold">Vendedor</th>
                <th className="px-2 py-2 text-left font-semibold">Prioridade</th>
                <th className="px-2 py-2 text-left font-semibold">Status</th>
                <th className="px-2 py-2 text-right font-semibold">Valor</th>
                <th className="px-2 py-2 text-right font-semibold">SLA</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes.map((q) => {
                const totals = quoteTotals(q.items);
                const owner = ownerById(q.owner_id);
                return (
                  <tr key={q.id} className="hover:bg-accent/40">
                    <td className="px-3 py-2">
                      <Link
                        to="/inbox"
                        search={{ open: q.id }}
                        className="font-semibold text-foreground hover:text-primary"
                      >
                        {q.customer_name}
                      </Link>
                      <div className="text-[10px] text-muted-foreground">#{q.id.toUpperCase()}</div>
                    </td>
                    <td className="px-2 py-2 text-muted-foreground">{owner.name}</td>
                    <td className="px-2 py-2"><PriorityBadge priority={q.priority} /></td>
                    <td className="px-2 py-2"><StatusBadge status={q.status} /></td>
                    <td className="px-2 py-2 text-right num font-semibold">{formatBRL(totals.revenue)}</td>
                    <td className="px-2 py-2 text-right"><SlaIndicator deadline={q.sla_deadline} compact /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
