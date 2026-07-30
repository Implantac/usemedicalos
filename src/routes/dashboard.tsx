import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, DollarSign, Percent, ShieldCheck, Ticket, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { IaInsightBar } from "@/components/medical/ia-insight-bar";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { KpiCard } from "@/components/medical/kpi-card";
import { SlaTimeline } from "@/components/medical/sla-timeline";
import { StatusDonut } from "@/components/medical/status-donut";
import { LeaderboardTable } from "@/components/medical/leaderboard-table";
import { ExceptionsTable } from "@/components/medical/exceptions-table";
import { useQuotes } from "@/hooks/use-quotes";
import { scoreQuotes } from "@/lib/medical/command-center";
import {
  computeKpis,
  dailySeries,
  exceptions,
  filterByDays,
  leaderboard,
  sourceDistribution,
  statusDistribution,
} from "@/lib/medical/analytics";
import { formatBRL, formatPct, quoteTotals } from "@/lib/medical/pricing";
import { SOURCE_LABEL } from "@/lib/medical/types";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

type DashboardSearch = { period: number };

export const Route = createFileRoute("/dashboard")({
  validateSearch: (raw: Record<string, unknown>): DashboardSearch => {
    const n = Number(raw.period);
    return { period: Number.isFinite(n) && n > 0 ? n : 30 };
  },
  head: () => ({
    meta: [
      { title: "Analytics — USE Medical" },
      { name: "description", content: "KPIs comerciais, SLA, performance por vendedor e cotações em risco em uma única tela." },
    ],
  }),
  component: AnalyticsPage,
});

const PERIODS = [7, 30, 90] as const;

function AnalyticsPage() {
  const navigate = useNavigate({ from: "/dashboard" });
  const { period } = Route.useSearch();
  const safePeriod = (PERIODS as readonly number[]).includes(period) ? period : 30;

  const { quotes, resetDemo } = useQuotes();
  const scoped = useMemo(() => filterByDays(quotes, safePeriod), [quotes, safePeriod]);
  const kpis = useMemo(() => computeKpis(scoped), [scoped]);
  const series = useMemo(() => dailySeries(quotes, Math.min(14, safePeriod)), [quotes, safePeriod]);
  const dist = useMemo(() => statusDistribution(scoped), [scoped]);
  const bySrc = useMemo(() => sourceDistribution(scoped), [scoped]);
  const board = useMemo(() => leaderboard(scoped), [scoped]);
  const excs = useMemo(() => exceptions(quotes), [quotes]);

  // IA Insight: melhor cotação para focar no período
  const topScored = useMemo(() => scoreQuotes(scoped).slice(0, 1), [scoped]);
  const insightMessage = useMemo(() => {
    if (topScored.length === 0) return "Nenhuma cotação ativa no período analisado.";
    const t = topScored[0];
    const totals = quoteTotals(t.quote.items);
    return `Melhor oportunidade: ${t.quote.customer_name} — ${formatBRL(totals.revenue)} · ${Math.round(t.winChance * 100)}% chance · lucro esperado ${formatBRL(t.expectedProfit)}`;
  }, [topScored]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint={`Últimos ${safePeriod} dias`} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Analytics comercial</h1>
            <p className="text-xs text-muted-foreground">
              Visão executiva de SLA, pipeline e performance nos últimos {safePeriod} dias.
            </p>
          </div>
          <div className="inline-flex rounded-lg border bg-card p-0.5 card-shadow" role="tablist" aria-label="Período">
            {PERIODS.map((p) => (
              <button
                key={p}
                role="tab"
                aria-selected={p === safePeriod}
                onClick={() => navigate({ search: { period: p } })}
                className={cn(
                  "h-7 rounded-md px-3 text-xs font-semibold transition-smooth press",
                  p === safePeriod
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* IA Insight — recomendação do período */}
        <IaInsightBar
          title="IA Comercial"
          message={insightMessage}
          actionLabel="Ver na Inbox"
          onAction={() => {
            if (topScored[0]) navigate({ to: "/inbox", search: { open: topScored[0].quote.id } });
          }}
          variant="info"
        />

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard label="Cotações ativas" value={kpis.activeCount} icon={Activity} tone="primary" />
          <KpiCard label="Pipeline aberto" value={formatBRL(kpis.pipeline)} icon={TrendingUp} tone="success" />
          <KpiCard label="Ticket médio" value={formatBRL(kpis.avgTicket)} icon={Ticket} />
          <KpiCard label="Win rate" value={formatPct(kpis.winRate)} icon={Percent} tone={kpis.winRate >= 0.5 ? "success" : "warning"} />
          <KpiCard label="Margem média" value={formatPct(kpis.avgMargin)} icon={DollarSign} tone={kpis.avgMargin < 0.12 ? "danger" : "success"} />
          <KpiCard
            label="SLA dentro do prazo"
            value={formatPct(kpis.slaHealth)}
            icon={ShieldCheck}
            tone={kpis.slaHealth >= 0.8 ? "success" : kpis.slaHealth >= 0.5 ? "warning" : "danger"}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <SlaTimeline data={series} />
          </div>
          <StatusDonut data={dist} />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LeaderboardTable rows={board} />
          </div>
          <div className="rounded-lg border bg-card p-3 card-shadow">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Origem das cotações
            </h3>
            <ul className="space-y-1.5 text-xs">
              {bySrc.map((s) => {
                const pct = scoped.length ? s.count / scoped.length : 0;
                return (
                  <li key={s.source}>
                    <div className="flex items-center justify-between">
                      <span className="text-foreground">{SOURCE_LABEL[s.source]}</span>
                      <span className="num text-muted-foreground">{s.count} · {formatPct(pct)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                      <div className="h-full bg-primary" style={{ width: `${pct * 100}%` }} />
                    </div>
                  </li>
                );
              })}
              {bySrc.length === 0 && (
                <li className="text-muted-foreground">Sem cotações no período.</li>
              )}
            </ul>
          </div>
        </div>

        <ExceptionsTable quotes={excs} />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
