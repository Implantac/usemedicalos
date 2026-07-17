import { Bell, BellOff, BellRing } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuotes } from "@/hooks/use-quotes";
import { useSlaNotifications } from "@/hooks/use-sla-notifications";
import { slaBucketOf } from "@/lib/medical/pipeline";
import { formatBRL, quoteTotals } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";

export function SlaAlertBell() {
  const [open, setOpen] = useState(false);
  const { quotes } = useQuotes();
  const notif = useSlaNotifications();

  const alerts = useMemo(() => {
    const rows = quotes
      .filter((q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao")
      .map((q) => ({ q, bucket: slaBucketOf(q.sla_deadline) }))
      .filter((r) => r.bucket !== "no_prazo")
      .sort((a, b) => new Date(a.q.sla_deadline).getTime() - new Date(b.q.sla_deadline).getTime());
    const overdue = rows.filter((r) => r.bucket === "atrasado").length;
    const risk = rows.filter((r) => r.bucket === "risco").length;
    return { rows, overdue, risk };
  }, [quotes]);

  const total = alerts.overdue + alerts.risk;
  const tone = alerts.overdue > 0 ? "danger" : "warning";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label={`Alertas de SLA (${total})`}
        >
          <Bell className="h-4 w-4" />
          {total > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white",
                tone === "danger" ? "bg-danger" : "bg-warning",
              )}
            >
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Alertas de SLA
          </div>
          <div className="mt-0.5 text-xs text-foreground">
            {alerts.overdue} atrasada(s) · {alerts.risk} em risco
          </div>
        </div>
        <div className="max-h-80 overflow-y-auto">
          {alerts.rows.length === 0 && (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhum SLA em risco. 🎯
            </div>
          )}
          {alerts.rows.slice(0, 10).map(({ q, bucket }) => {
            const totals = quoteTotals(q.items);
            return (
              <Link
                key={q.id}
                to="/"
                search={{ open: q.id }}
                onClick={() => setOpen(false)}
                className="block border-b px-3 py-2 text-left transition-colors hover:bg-muted"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {q.customer_name}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase",
                      bucket === "atrasado"
                        ? "bg-danger/15 text-danger"
                        : "bg-warning/15 text-warning",
                    )}
                  >
                    {bucket === "atrasado" ? "Atrasada" : "Em risco"}
                  </span>
                </div>
                <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>#{q.id.toUpperCase()}</span>
                  <span className="num">{formatBRL(totals.revenue)}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}
