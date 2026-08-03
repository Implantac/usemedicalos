import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, DollarSign, Percent, ShieldCheck, Ticket, TrendingUp, Radar as RadarIcon, Sparkles, AlertTriangle } from "lucide-react";
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
  sourceDistribution,
  statusDistribution,
} from "@/lib/medical/analytics";
import { computeOpportunities, scoreQuotes, computeRadar, antiRecommendation } from "@/lib/medical/command-center";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { SOURCE_LABEL } from "@/lib/medical/types";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

type DashboardSearch = { period: number };

export const Route = createFileRoute("/command")({
  validateSearch: (raw: Record<string, unknown>): DashboardSearch => {
    const n = Number(raw.period);
    return { period: Number.isFinite(n) && n > 0 ? n : 30 };
  },
  head: () => ({
    meta: [
      { title: "Command Center — USE Medical" },
      { name: "description", content: "Centro de Inteligência Comercial: Radar em tempo real, Score IA e recomendações preditivas." },
    ],
  }),
  component: CommandCenterPage,
});

const PERIODS = [7, 30, 90] as const;

function CommandCenterPage() {
  const navigate = useNavigate({ from: "/command" });
  const { period } = Route.useSearch();
  const safePeriod = (PERIODS as readonly number[]).includes(period) ? period : 30;

  const { quotes, resetDemo } = useQuotes();
  const scoped = useMemo(() => filterByDays(quotes, safePeriod), [quotes, safePeriod]);
  const kpis = useMemo(() => computeKpis(scoped), [scoped]);
  const series = useMemo(() => dailySeries(quotes, Math.min(14, safePeriod)), [quotes, safePeriod]);
  const dist = useMemo(() => statusDistribution(scoped), [scoped]);
  const board = useMemo(() => leaderboard(scoped), [scoped]);
  const excs = useMemo(() => exceptions(quotes), [quotes]);
  
  // Command Center Engine
  const opps = useMemo(() => computeOpportunities(quotes), [quotes]);
  const scores = useMemo(() => scoreQuotes(quotes).slice(0, 3), [quotes]);
  const radar = useMemo(() => computeRadar(quotes), [quotes]);
  const antiRec = useMemo(() => antiRecommendation(quotes), [quotes]);

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Operação em Tempo Real" />
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-primary">
              <RadarIcon className="h-4 w-4 animate-pulse" /> Live Command Center
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground">Inteligência Comercial</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="hidden rounded-full border bg-card px-3 py-1 text-[10px] font-medium text-muted-foreground lg:block">
              Atualizado agora · <span className="text-success">Conectado ao ERP</span>
            </div>
            <div className="inline-flex rounded-lg border bg-card p-0.5 card-shadow" role="tablist">
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
        </div>

        {/* Módulo Radar (Funil de Hoje) */}
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-6">
          <RadarStat label="Novas (Hoje)" value={radar.novas} tone="primary" />
          <RadarStat label="Negociação" value={radar.negociacao} />
          <RadarStat label="Enviadas" value={radar.enviadas} />
          <RadarStat label="Ganhas (Hoje)" value={radar.ganhas} tone="success" />
          <RadarStat label="Perdidas" value={radar.perdidas} tone="danger" />
          <RadarStat label="Conversão" value={formatPct(radar.ganhas / (radar.ganhas + radar.perdidas || 1))} />
        </div>

        <div className="grid gap-3 lg:grid-cols-12">
          {/* Coluna Principal: Oportunidades & Score IA */}
          <div className="space-y-3 lg:col-span-8">
            {/* Oportunidades Críticas */}
            <div className="rounded-3xl border border-border bg-card p-5 card-shadow">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Oportunidades IA</h3>
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              
              <div className="mt-6 grid grid-cols-2 gap-6 md:grid-cols-4">
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Valor em Aberto</div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{formatBRL(opps.potentialValue)}</div>
                  <div className="text-[10px] text-success">↑ 12% vs ontem</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Win Rate Previsto</div>
                  <div className="text-2xl font-bold tracking-tight text-foreground">{formatPct(opps.avgWinChance)}</div>
                  <div className="text-[10px] text-muted-foreground">Baseado em histórico</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Receita Estimada</div>
                  <div className="text-2xl font-bold tracking-tight text-primary">{formatBRL(opps.predictedOrders)}</div>
                  <div className="text-[10px] text-muted-foreground">Ajustado por probabilidade</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Vencendo em 30min</div>
                  <div className="text-2xl font-bold tracking-tight text-danger">{opps.expire30min}</div>
                  <div className="text-[10px] text-danger animate-pulse">Ação imediata recomendada</div>
                </div>
              </div>

              <div className="mt-8 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Recomendações Próxima Melhor Ação</div>
                {scores.map((s, idx) => (
                  <Link 
                    to="/cotacao/$id" 
                    params={{ id: s.quote.id }}
                    key={s.quote.id} 
                    className="flex items-center justify-between rounded-2xl border bg-background p-3 transition-colors hover:bg-accent/50"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-foreground">{s.quote.customer_name}</div>
                        <div className="text-[10px] text-muted-foreground">{s.reason}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-success">{formatPct(s.winChance)} chance</div>
                      <div className="text-[10px] text-muted-foreground">Lucro esperado: {formatBRL(s.expectedProfit)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <SlaTimeline data={series} />
              <StatusDonut data={dist} />
            </div>
          </div>

          {/* Coluna Lateral: Riscos & Insights */}
          <div className="space-y-3 lg:col-span-4">
            {/* Anti-Recomendação (Filtro de Ruído) */}
            {antiRec && (
              <div className="rounded-3xl border border-danger/20 bg-danger/5 p-5">
                <div className="flex items-center gap-2 text-xs font-bold text-danger">
                  <AlertTriangle className="h-4 w-4" /> ALERTA DE RISCO
                </div>
                <div className="mt-3">
                  <div className="text-sm font-bold text-foreground">{antiRec.quote.customer_name}</div>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                    {antiRec.reason}. Recomendamos despriorizar para focar em itens de maior conversão.
                  </p>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="xs" variant="outline" className="h-7 text-[10px] border-danger/20 hover:bg-danger/10" asChild>
                    <Link to="/cotacao/$id" params={{ id: antiRec.quote.id }}>Ver detalhes</Link>
                  </Button>
                </div>
              </div>
            )}

            <LeaderboardTable rows={board} />
            
            <div className="rounded-3xl border border-border bg-card p-4 card-shadow">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Marketplace de Conectores</h3>
              <div className="space-y-2">
                <Connector status="online" name="Bionexo" sync="2 min atrás" />
                <Connector status="online" name="Apoio Cotar" sync="Just now" />
                <Connector status="offline" name="Sintese" sync="Falha na conexão" />
                <Connector status="online" name="TOTVS Protheus" sync="Real-time" />
              </div>
            </div>
          </div>
        </div>

        <ExceptionsTable quotes={excs} />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function RadarStat({ label, value, tone }: { label: string; value: string | number; tone?: "primary" | "success" | "danger" }) {
  return (
    <div className="rounded-3xl border border-border bg-card p-4 card-shadow text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn(
        "mt-2 text-2xl font-bold tracking-tight",
        tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : tone === "danger" ? "text-danger" : "text-foreground"
      )}>
        {value}
      </div>
    </div>
  );
}

function Connector({ name, status, sync }: { name: string; status: "online" | "offline"; sync: string }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-background p-2 border border-transparent hover:border-border transition-colors">
      <div className="flex items-center gap-2">
        <div className={cn("h-1.5 w-1.5 rounded-full", status === "online" ? "bg-success animate-pulse" : "bg-muted")} />
        <span className="text-[10px] font-bold text-foreground">{name}</span>
      </div>
      <span className="text-[9px] text-muted-foreground">{sync}</span>
    </div>
  );
}
