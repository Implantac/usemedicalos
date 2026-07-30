import { AlertTriangle, Inbox, TrendingUp, Timer } from "lucide-react";
import type { Quote } from "@/lib/medical/types";
import { formatBRL, quoteTotals } from "@/lib/medical/pricing";
import { slaState } from "./sla-indicator";

export function QuoteStats({ quotes }: { quotes: Quote[] }) {
  const pending = quotes.filter((q) => q.status === "aguardando_precificacao").length;
  const negotiating = quotes.filter((q) => q.status === "em_negociacao").length;
  const atRisk = quotes.filter((q) => {
    const s = slaState(q.sla_deadline);
    return q.status !== "enviado" && q.status !== "ganho" && q.status !== "perdido" && s.tone !== "ok";
  }).length;
  const pipeline = quotes
    .filter((q) => q.status !== "perdido")
    .reduce((sum, q) => sum + quoteTotals(q.items).revenue, 0);

  const items = [
    { label: "Cotações abertas", value: pending + negotiating, icon: Inbox, tone: "text-primary" },
    { label: "Em risco de SLA", value: atRisk, icon: AlertTriangle, tone: "text-danger" },
    { label: "Em negociação", value: negotiating, icon: Timer, tone: "text-warning-foreground" },
    { label: "Pipeline total", value: formatBRL(pipeline), icon: TrendingUp, tone: "text-success" },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
      {items.map((it) => {
        const Icon = it.icon;
        return (
          <div key={it.label} className="rounded-lg border bg-card p-3 card-shadow">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{it.label}</span>
              <Icon className={`h-4 w-4 ${it.tone}`} />
            </div>
            <div className="mt-1 num text-lg font-bold text-foreground">{it.value}</div>
          </div>
        );
      })}
    </div>
  );
}
