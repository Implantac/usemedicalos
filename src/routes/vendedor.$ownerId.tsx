import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  Coins,
  DollarSign,
  Gauge,
  Minus,
  Percent,
  Ticket,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { KpiCard } from "@/components/medical/kpi-card";
import { PriorityBadge, StatusBadge } from "@/components/medical/badges";
import { SlaIndicator } from "@/components/medical/sla-indicator";
import { DailyGoalRing } from "@/components/medical/daily-goal-ring";
import { AchievementBadge } from "@/components/medical/achievement-badge";
import { PerformanceChart } from "@/components/medical/performance-chart";
import { useQuotes } from "@/hooks/use-quotes";
import { useOwnerGoals } from "@/hooks/use-owner-goals";
import { OWNERS, ownerById } from "@/lib/medical/mock-data";
import { computeAchievements } from "@/lib/medical/achievements";
import {
  computeKpis,
  leaderboard,
  performanceTrend,
  teamLeaderboard,
} from "@/lib/medical/analytics";
import { formatBRL, formatPct, quoteTotals } from "@/lib/medical/pricing";
import { summarizeForOwner } from "@/lib/medical/commission";
import { benchmarkFor, type Region } from "@/lib/medical/benchmarks";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

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
  const { getGoal, setGoal, resetGoal, DEFAULT_GOAL } = useOwnerGoals();
  const [goalEdit, setGoalEdit] = useState<number | null>(null);

  const dailyGoal = getGoal(ownerId);

  const mine = useMemo(() => quotes.filter((q) => q.owner_id === ownerId), [quotes, ownerId]);
  const kpis = useMemo(() => computeKpis(mine), [mine]);
  const commission = useMemo(() => summarizeForOwner(mine, dailyGoal), [mine, dailyGoal]);
  const achievements = useMemo(() => computeAchievements(ownerId, quotes), [ownerId, quotes]);
  const trend = useMemo(() => performanceTrend(mine, 30), [mine]);
  const board = useMemo(() => leaderboard(quotes), [quotes]);
  const ranking = useMemo(() => {
    const idx = board.findIndex((r) => r.owner.id === ownerId);
    return idx >= 0 ? idx + 1 : null;
  }, [board, ownerId]);
  const teamBoard = useMemo(() => teamLeaderboard(quotes), [quotes]);
  const teamRanking = useMemo(() => {
    const idx = teamBoard.findIndex((r) => r.ownerId === ownerId);
    return idx >= 0 ? idx + 1 : null;
  }, [teamBoard, ownerId]);
  const sorted = useMemo(
    () => [...mine].sort((a, b) => (a.received_at < b.received_at ? 1 : -1)),
    [mine],
  );

  const unlockedCount = achievements.filter((a) => a.unlocked).length;

  const saveGoal = () => {
    if (goalEdit === null) return;
    if (!Number.isFinite(goalEdit) || goalEdit < 0) return;
    setGoal(ownerId, goalEdit);
    setGoalEdit(null);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Filtra cotações do vendedor pelo escopo ativo" />
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
              <h1 className="truncate text-lg font-bold tracking-tight text-foreground">
                {owner.name}
              </h1>
              <p className="truncate text-xs text-muted-foreground">
                Território: {owner.territory}
              </p>
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
                {commission.quote_count} cotação(ões) no mês · margem média{" "}
                <span
                  className={
                    kpis.avgMargin >= 0.15
                      ? "font-bold text-success"
                      : kpis.avgMargin >= 0.12
                        ? "font-bold text-warning-foreground"
                        : "font-bold text-danger"
                  }
                >
                  {formatPct(kpis.avgMargin)}
                </span>
                {kpis.avgMargin < 0.15 &&
                  kpis.avgMargin >= 0.12 &&
                  " — cada +1% de margem sobe seu tier"}
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
            tone={kpis.avgMargin < 0.12 ? "danger" : kpis.avgMargin < 0.15 ? "warning" : "success"}
          />
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <div className="rounded-lg border bg-card p-3 card-shadow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Trophy className="h-4 w-4 text-brand" /> Ranking de comissão
              </div>
              {ranking !== null && (
                <span className="rounded bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                  #{ranking}
                </span>
              )}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">
              {ranking !== null
                ? `Você está em ${ranking}º lugar entre ${board.length} vendedores em comissão estimada este mês.`
                : "Sem dados para ranquear."}
            </div>
            <Button asChild size="sm" variant="outline" className="mt-3 h-7 gap-1 text-[11px]">
              <Link to="/dashboard" search={{ period: 30 }}>
                Ver ranking completo
              </Link>
            </Button>
          </div>
          <DailyGoalRing progress={commission.daily_progress} goal={commission.daily_goal} />
          <KpiCard
            label="Comissão MTD"
            value={formatBRL(commission.mtd_total)}
            icon={Coins}
            tone="success"
          />
          <KpiCard
            label="Ganhas (mês)"
            value={formatBRL(commission.mtd_won)}
            icon={Award}
            tone="primary"
          />
        </div>

        {/* Meta diária configurável */}
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="h-4 w-4 text-brand" /> Meta diária de comissão
            </div>
            {goalEdit === null ? (
              <div className="flex items-center gap-2">
                <span className="num text-sm font-bold text-foreground">
                  {formatBRL(dailyGoal)}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 gap-1 text-[11px]"
                  onClick={() => setGoalEdit(dailyGoal)}
                >
                  Editar
                </Button>
                {dailyGoal !== DEFAULT_GOAL && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-[11px]"
                    onClick={() => resetGoal(ownerId)}
                  >
                    Restaurar padrão
                  </Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step={50}
                  value={goalEdit}
                  onChange={(e) => setGoalEdit(Number(e.target.value))}
                  className="h-8 w-32 num"
                  autoFocus
                />
                <Button size="sm" className="h-8 gap-1 text-[11px]" onClick={saveGoal}>
                  Salvar
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-8 text-[11px]"
                  onClick={() => setGoalEdit(null)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            A meta diária alimenta o anel de progresso e a conquista de "Consistência".
          </p>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <KpiCard
            label="Pipeline comissão"
            value={formatBRL(commission.mtd_pipeline)}
            icon={TrendingUp}
          />
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <PerformanceChart data={trend} />
          </div>
          <div className="rounded-lg border bg-card p-3 card-shadow">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Conquistas
              </h3>
              <span className="text-[10px] text-muted-foreground">
                {unlockedCount}/{achievements.length}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {achievements.map((a) => (
                <AchievementBadge key={a.id} achievement={a} />
              ))}
            </div>
          </div>
        </div>

<RegionBenchmarkCard
          region={owner.territory as Region}
          quotes={mine}
          selfAvgMargin={kpis.avgMargin}
          selfAvgTicket={kpis.avgTicket}
          selfWinRate={kpis.winRate}
        />

        {/* Melhoria E: leaderboard de equipe (tenant) */}
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Ranking da equipe
            </h3>
            {teamRanking !== null && (
              <span className="rounded bg-brand/15 px-2 py-0.5 text-[11px] font-bold text-brand">
                Você: #{teamRanking}
              </span>
            )}
          </div>
          {teamBoard.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Sem dados de equipe no escopo atual.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="border-b bg-muted/20 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="px-2 py-1 text-left font-semibold">#</th>
                    <th className="px-2 py-1 text-left font-semibold">Vendedor</th>
                    <th className="px-2 py-1 text-right font-semibold">Cotações</th>
                    <th className="px-2 py-1 text-right font-semibold">Pipeline</th>
                    <th className="px-2 py-1 text-right font-semibold">Ganhas</th>
                    <th className="px-2 py-1 text-right font-semibold">Comissão</th>
                    <th className="px-2 py-1 text-right font-semibold">Win rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {teamBoard.map((r, i) => {
                    const me = r.ownerId === ownerId;
                    return (
                      <tr
                        key={r.ownerId}
                        className={
                          me ? "bg-brand/5 font-semibold" : "hover:bg-accent/40"
                        }
                      >
                        <td className="px-2 py-1 num">{i + 1}</td>
                        <td className="px-2 py-1">
                          <div className="flex items-center gap-2">
                            <span className="grid h-5 w-5 place-items-center rounded-full bg-muted text-[9px] font-bold text-muted-foreground">
                              {r.initialization}
                            </span>
                            <span className="truncate">{r.ownerName}</span>
                          </div>
                        </td>
                        <td className="px-2 py-1 text-right num">{r.quotes}</td>
                        <td className="px-2 py-1 text-right num">{formatBRL(r.pipeline)}</td>
                        <td className="px-2 py-1 text-right num">{formatBRL(r.wonRevenue)}</td>
                        <td className="px-2 py-1 text-right num font-semibold text-success">
                          {formatBRL(r.commissionWon)}
                        </td>
                        <td className="px-2 py-1 text-right num">{formatPct(r.winRate)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="overflow-hidden rounded-lg border bg-card card-shadow">
          <div className="border-b bg-muted/40 px-2 py-1">
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
                    <th className="px-2 py-1 text-left font-semibold">Cliente</th>
                    <th className="px-2 py-1 text-left font-semibold">Prioridade</th>
                    <th className="px-2 py-1 text-left font-semibold">Status</th>
                    <th className="px-2 py-1 text-right font-semibold">Itens</th>
                    <th className="px-2 py-1 text-right font-semibold">Valor</th>
                    <th className="px-2 py-1 text-right font-semibold">Margem</th>
                    <th className="px-2 py-1 text-right font-semibold">SLA</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {sorted.map((q) => {
                    const t = quoteTotals(q.items);
                    return (
                      <tr key={q.id} className="hover:bg-accent/40">
                        <td className="px-2 py-1">
                          <Link
                            to="/inbox"
                            search={{ open: q.id }}
                            className="font-semibold text-foreground hover:text-primary"
                          >
                            {q.customer_name}
                          </Link>
                          <div className="text-[10px] text-muted-foreground">
                            {q.customer_segment} · #{q.id.toUpperCase()}
                          </div>
                        </td>
                        <td className="px-2 py-1">
                          <PriorityBadge priority={q.priority} />
                        </td>
                        <td className="px-2 py-1">
                          <StatusBadge status={q.status} />
                        </td>
                        <td className="px-2 py-1 text-right num">{q.items.length}</td>
                        <td className="px-2 py-1 text-right num font-semibold">
                          {formatBRL(t.revenue)}
                        </td>
                        <td
                          className={
                            "px-2 py-1 text-right num font-semibold " +
                            (t.margin < 0.12 ? "text-danger" : "text-success")
                          }
                        >
                          {formatPct(t.margin)}
                        </td>
                        <td className="px-2 py-1 text-right">
                          {q.status === "aguardando_precificacao" ||
                          q.status === "em_negociacao" ? (
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

function RegionBenchmarkCard({
  region,
  quotes,
  selfAvgMargin,
  selfAvgTicket,
  selfWinRate,
}: {
  region: Region;
  quotes: ReturnType<typeof useQuotes>["quotes"];
  selfAvgMargin: number;
  selfAvgTicket: number;
  selfWinRate: number;
}) {
  const mk = benchmarkFor(region);
  const closed = quotes.filter((q) => q.status === "ganho" || q.status === "perdido");
  const sampleSize = quotes.length;
  const marginDelta = selfAvgMargin - mk.avgMargin;
  const ticketDelta = mk.avgTicket ? (selfAvgTicket - mk.avgTicket) / mk.avgTicket : 0;
  const winDelta = selfWinRate - mk.winRate;

  const Cell = ({
    label,
    value,
    marketLabel,
    delta,
    kind,
  }: {
    label: string;
    value: string;
    marketLabel: string;
    delta: number;
    kind: "pp" | "pct";
  }) => {
    const zero = Math.abs(delta) < 0.001;
    const up = delta > 0;
    const Icon = zero ? Minus : up ? ArrowUp : ArrowDown;
    const tone = zero ? "text-muted-foreground" : up ? "text-success" : "text-destructive";
    const deltaLabel = kind === "pp" ? `${(delta * 100).toFixed(1)}pp` : formatPct(delta);
    return (
      <div className="rounded-md border bg-muted/20 p-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="mt-0.5 flex items-baseline justify-between gap-2">
          <span className="num text-lg font-bold text-foreground">{value}</span>
          <span
            className={cn("inline-flex items-center gap-0.5 num text-[11px] font-semibold", tone)}
          >
            <Icon className="h-3 w-3" />
            {deltaLabel}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground">
          Mercado: <span className="num">{marketLabel}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Comparativo com meu território
        </h3>
        <span className="text-[10px] text-muted-foreground">
          {region} · minha amostra: {sampleSize} · mercado: {mk.sampleSize} distribuidores
        </span>
      </div>
      <div className="grid gap-2 sm:grid-cols-3">
        <Cell
          label="Margem média"
          value={formatPct(selfAvgMargin)}
          marketLabel={formatPct(mk.avgMargin)}
          delta={marginDelta}
          kind="pp"
        />
        <Cell
          label="Ticket médio"
          value={formatBRL(selfAvgTicket)}
          marketLabel={formatBRL(mk.avgTicket)}
          delta={ticketDelta}
          kind="pct"
        />
        <Cell
          label="Win rate"
          value={closed.length ? formatPct(selfWinRate) : "—"}
          marketLabel={formatPct(mk.winRate)}
          delta={closed.length ? winDelta : 0}
          kind="pp"
        />
      </div>
      <p className="mt-2 text-[10px] text-muted-foreground">
        Baseline de mercado anonimizado por região (LGPD). Nenhum distribuidor é identificável.
      </p>
    </div>
  );
}
