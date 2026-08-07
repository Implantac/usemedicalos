import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  DollarSign,
  Percent,
  ShieldCheck,
  Ticket,
  TrendingUp,
  HandCoins,
  Users,
} from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { KpiCard } from "@/components/medical/kpi-card";
import { SlaTimeline } from "@/components/medical/sla-timeline";
import { StatusDonut } from "@/components/medical/status-donut";
import { LeaderboardTable } from "@/components/medical/leaderboard-table";
import { ExceptionsTable } from "@/components/medical/exceptions-table";
import { useQuotes } from "@/hooks/use-quotes";
import {
  computeKpis,
  dailySeries,
  exceptions,
  filterByDays,
  leaderboard,
  marginLeftOnTable,
  sourceConversion,
  sourceDistribution,
  statusDistribution,
  teamLeaderboard,
} from "@/lib/medical/analytics";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
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
      { title: "Dashboard — USE Medical" },
      {
        name: "description",
        content:
          "KPIs comerciais, SLA, performance por vendedor e cotações em risco em uma única tela.",
      },
    ],
  }),
  component: DashboardPage,
});

const PERIODS = [7, 30, 90] as const;

function DashboardPage() {
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
  // Melhoria C: conversão por fonte
  const convBySrc = useMemo(() => sourceConversion(scoped), [scoped]);
  // Melhoria D: margem deixada na mesa
  const marginTable = useMemo(() => marginLeftOnTable(scoped), [scoped]);
  // Melhoria E: leaderboard de equipe
  const teamBoard = useMemo(() => teamLeaderboard(scoped), [scoped]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint={`Últimos ${safePeriod} dias`} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Dashboard comercial
            </h1>
            <p className="text-xs text-muted-foreground">
              Visão executiva de SLA, pipeline e performance nos últimos {safePeriod} dias.
            </p>
          </div>
          <div
            className="inline-flex rounded-lg border bg-card p-0.5 card-shadow"
            role="tablist"
            aria-label="Período"
          >
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

        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <KpiCard
            label="Cotações ativas"
            value={kpis.activeCount}
            icon={Activity}
            tone="primary"
          />
          <KpiCard
            label="Pipeline aberto"
            value={formatBRL(kpis.pipeline)}
            icon={TrendingUp}
            tone="success"
          />
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
            tone={kpis.avgMargin < 0.12 ? "danger" : "success"}
          />
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
                      <span className="num text-muted-foreground">
                        {s.count} · {formatPct(pct)}
                      </span>
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

        {/* Melhoria D: margem deixada na mesa + Melhoria C: conversão por fonte */}
        <div className="grid gap-3 lg:grid-cols-3">
          <div className="rounded-lg border bg-card p-3 card-shadow">
            <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <HandCoins className="h-3.5 w-3.5" /> Margem deixada na mesa
            </h3>
            <div className="num text-lg font-bold text-foreground">
              {formatBRL(marginTable.marginLeftOnTableBRL)}
            </div>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {marginTable.quoteCount} proposta(s)
            </p>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Margem realizada</span>
                  <span className="num font-semibold text-foreground">
                    {formatPct(marginTable.realizedMargin)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-success"
                    style={{ width: `${Math.min(100, marginTable.realizedMargin * 100)}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Margem sugerida</span>
                  <span className="num font-semibold text-foreground">
                    {formatPct(marginTable.suggestedMargin)}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
                  <div
                    className="h-full bg-warning"
                    style={{ width: `${Math.min(100, marginTable.suggestedMargin * 100)}%` }}
                  />
                </div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              A diferença entre as barras é a margem "deixada na mesa" (R${" "}
              <span className="num font-semibold text-foreground">
                {formatBRL(marginTable.marginLeftOnTableBRL)}
              </span>
              ).
            </p>
          </div>

          <div className="rounded-lg border bg-card p-3 card-shadow lg:col-span-2">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Conversão por fonte
            </h3>
            <ul className="space-y-2 text-xs">
              {convBySrc.map((s) => (
                <li key={s.source}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{SOURCE_LABEL[s.source]}</span>
                    <span className="num text-muted-foreground">
                      {s.count} cotações · respondidas {s.responded}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center gap-2">
                    <div className="flex-1 h-1.5 overflow-hidden rounded bg-muted">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${s.responseRate * 100}%` }}
                      />
                    </div>
                    <span className="num w-10 text-right text-[10px] text-muted-foreground">
                      resp {formatPct(s.responseRate)}
                    </span>
                    <span className="num w-10 text-right text-[10px] text-muted-foreground">
                      win {formatPct(s.winRate)}
                    </span>
                  </div>
                </li>
              ))}
              {convBySrc.length === 0 && (
                <li className="text-muted-foreground">Sem cotações no período.</li>
              )}
            </ul>
          </div>
        </div>

        {/* Melhoria E: leaderboard de equipe */}
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
            <Users className="h-3.5 w-3.5" /> Leaderboard de equipe (tenant)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b text-[10px] uppercase text-muted-foreground">
                  <th className="py-1.5 pr-2 font-semibold">Vendedor</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Cotações</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Pipeline</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Ganho (R$)</th>
                  <th className="py-1.5 pr-2 text-right font-semibold">Comissão</th>
                  <th className="py-1.5 text-right font-semibold">Win rate</th>
                </tr>
              </thead>
              <tbody>
                {teamBoard.map((r) => (
                  <tr key={r.ownerId} className="border-b border-border/40 last:border-0">
                    <td className="py-1.5 pr-2 font-medium text-foreground">
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-primary/15 text-[9px] font-bold text-primary">
                        {r.initialization}
                      </span>
                      {r.ownerName}
                    </td>
                    <td className="py-1.5 pr-2 text-right num text-muted-foreground">{r.quotes}</td>
                    <td className="py-1.5 pr-2 text-right num text-muted-foreground">
                      {formatBRL(r.pipeline)}
                    </td>
                    <td className="py-1.5 pr-2 text-right num text-muted-foreground">
                      {formatBRL(r.wonRevenue)}
                    </td>
                    <td className="py-1.5 pr-2 text-right num font-semibold text-foreground">
                      {formatBRL(r.commissionWon)}
                    </td>
                    <td className="py-1.5 text-right num text-muted-foreground">
                      {formatPct(r.winRate)}
                    </td>
                  </tr>
                ))}
                {teamBoard.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-2 text-muted-foreground">
                      Sem dados no período.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <ExceptionsTable quotes={excs} />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
