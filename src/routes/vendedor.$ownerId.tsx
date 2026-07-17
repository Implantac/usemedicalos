import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, ArrowLeft, Award, Coins, DollarSign, Percent, Ticket, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { KpiCard } from "@/components/medical/kpi-card";
import { PriorityBadge, StatusBadge } from "@/components/medical/badges";
import { SlaIndicator } from "@/components/medical/sla-indicator";
import { DailyGoalRing } from "@/components/medical/daily-goal-ring";
import { CommissionBadge } from "@/components/medical/commission-badge";
import { useQuotes } from "@/hooks/use-quotes";
import { OWNERS, ownerById } from "@/lib/medical/mock-data";
import { computeKpis } from "@/lib/medical/analytics";
import { formatBRL, formatPct, quoteTotals } from "@/lib/medical/pricing";
import { summarizeForOwner } from "@/lib/medical/commission";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/vendedor/$ownerId")({
  loader: ({ params }) => {
    if (!OWNERS.some((o) => o.id === params.ownerId)) throw notFound();
  },
  head: ({ params }) => {
    const owner = OWNERS.find((o) => o.id === params.ownerId);
    return {
      meta: [
        { title: `${owner?.name ?? "Vendedor"} — USE Medical` },
        {
          name: "description",
          content: "Cotações, pipeline, margem e SLA por vendedor da USE Medical.",
        },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-muted-foreground">
      Vendedor não encontrado.
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="min-h-screen grid place-items-center bg-background text-sm text-destructive">
      Erro: {error.message}
    </div>
  ),
  component: OwnerPage,
});

function OwnerPage() {
  const { ownerId } = Route.useParams();
  const owner = ownerById(ownerId);
  const { quotes, resetDemo } = useQuotes();

  const mine = useMemo(() => quotes.filter((q) => q.owner_id === ownerId), [quotes, ownerId]);
  const kpis = useMemo(() => computeKpis(mine), [mine]);
  const commission = useMemo(() => summarizeForOwner(mine), [mine]);
  const sorted = useMemo(
    () => [...mine].sort((a, b) => (a.received_at < b.received_at ? 1 : -1)),
    [mine],
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/dashboard"
            search={{ period: 30 }}
            className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md border bg-card px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-primary/10 text-sm font-bold text-primary">
              {owner.initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground">{owner.name}</h1>
              <p className="truncate text-xs text-muted-foreground">Território: {owner.territory}</p>
            </div>
          </div>
        </div>

        {/* HERO: Comissão estimada — gamificação financeira em destaque */}
        <div className="rounded-xl border-2 border-success/40 bg-gradient-to-br from-success/15 via-success/5 to-transparent p-4 shadow-sm sm:p-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Comissão estimada — mês atual
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="num text-4xl font-black tracking-tight text-success sm:text-5xl">
                  {formatBRL(commission.mtd_total)}
                </span>
                <span className="text-xs font-semibold text-muted-foreground">
                  + {formatBRL(commission.mtd_pipeline)} em pipeline
                </span>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {commission.won_count} ganha(s) · margem média{" "}
                <span className={kpis.avgMargin >= 0.15 ? "font-bold text-success" : kpis.avgMargin >= 0.12 ? "font-bold text-warning-foreground" : "font-bold text-danger"}>
                  {formatPct(kpis.avgMargin)}
                </span>
                {kpis.avgMargin < 0.15 && kpis.avgMargin >= 0.12 && " — cada +1% de margem sobe seu tier"}
                {kpis.avgMargin < 0.12 && " — margem crítica: comissão zerada"}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="grid h-14 w-14 place-items-center rounded-full bg-success/20 text-success">
                <Coins className="h-7 w-7" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-5">
          <KpiCard label="Cotações ativas" value={kpis.activeCount} icon={Activity} tone="primary" />
          <KpiCard label="Pipeline aberto" value={formatBRL(kpis.pipeline)} icon={TrendingUp} tone="success" />
          <KpiCard label="Ticket médio" value={formatBRL(kpis.avgTicket)} icon={Ticket} />
          <KpiCard
            label="Win rate"
            value={formatPct(kpis.winRate)}
            icon={Percent}
            tone={kpis.winRate >= 0.5 ? "success" : "warning"}
          />
          <KpiCard
            label="Margem média"
            value={formatPct(kpis.avgMargin)}
            icon={DollarSign}
            tone={kpis.avgMargin < 0.12 ? "danger" : kpis.avgMargin < 0.15 ? "warning" : "success"}
          />
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <DailyGoalRing progress={commission.daily_progress} goal={commission.daily_goal} />
          <KpiCard label="Comissão MTD" value={formatBRL(commission.mtd_total)} icon={Coins} tone="success" />
          <KpiCard label="Ganhas (mês)" value={formatBRL(commission.mtd_won)} icon={Award} tone="primary" />
          <KpiCard label="Pipeline comissão" value={formatBRL(commission.mtd_pipeline)} icon={TrendingUp} />
        </div>

        <div className="overflow-hidden rounded-lg border bg-card card-shadow">
          <div className="border-b bg-muted/40 px-3 py-2">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Cotações do vendedor ({sorted.length})
            </h3>
          </div>
          {sorted.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Nenhuma cotação atribuída.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left font-semibold">Cliente</th>
                    <th className="px-2 py-2 text-left font-semibold">Prioridade</th>
                    <th className="px-2 py-2 text-left font-semibold">Status</th>
                    <th className="px-2 py-2 text-right font-semibold">Itens</th>
                    <th className="px-2 py-2 text-right font-semibold">Valor</th>
                    <th className="px-2 py-2 text-right font-semibold">Margem</th>
                    <th className="px-2 py-2 text-right font-semibold">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((q) => {
                    const t = quoteTotals(q.items);
                    return (
                      <tr key={q.id} className="hover:bg-accent/40">
                        <td className="px-3 py-2">
                          <Link
                            to="/"
                            search={{ open: q.id }}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {q.customer_name}
                          </Link>
                          <div className="text-[10px] text-muted-foreground">
                            {q.customer_segment} · #{q.id.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-2 py-2"><PriorityBadge priority={q.priority} /></td>
                        <td className="px-2 py-2"><StatusBadge status={q.status} /></td>
                        <td className="px-2 py-2 text-right num">{q.items.length}</td>
                        <td className="px-2 py-2 text-right num font-semibold">{formatBRL(t.revenue)}</td>
                        <td
                          className={
                            "px-2 py-2 text-right num font-semibold " +
                            (t.margin < 0.12 ? "text-danger" : "text-success")
                          }
                        >
                          {formatPct(t.margin)}
                        </td>
                        <td className="px-2 py-2 text-right">
                          {q.status === "aguardando_precificacao" || q.status === "em_negociacao" ? (
                            <SlaIndicator deadline={q.sla_deadline} compact />
                          ) : (
                            <span className="text-[10px] text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
