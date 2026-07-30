import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity as ActivityIcon,
  AlertOctagon,
  ArrowRight,
  Clock,
  Flame,
  Sparkles,
  Target,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Toaster } from "@/components/ui/sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useHydrated } from "@/hooks/use-hydrated";
import {
  antiRecommendation,
  computeOpportunities,
  computeRadar,
  recentTimeline,
  scoreQuotes,
} from "@/lib/medical/command-center";
import { loadActivities } from "@/lib/medical/activity";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { slaState } from "@/components/medical/sla-indicator";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Command Center — USE Medical" },
      {
        name: "description",
        content:
          "Centro de operações comerciais em tempo real: oportunidades, IA prescritiva, radar do funil e timeline viva.",
      },
      { property: "og:title", content: "Command Center — USE Medical" },
      {
        property: "og:description",
        content: "O NOC comercial da distribuição hospitalar.",
      },
    ],
  }),
  component: CommandCenterPage,
});

function CommandCenterPage() {
  const navigate = useNavigate();
  const { quotes, resetDemo } = useQuotes();
  const hydrated = useHydrated();

  const [now, setNow] = useState(() => Date.now());
  const [clockTime, setClockTime] = useState("");
  useEffect(() => {
    setClockTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    const t = setInterval(() => {
      setNow(Date.now());
      setClockTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    }, 30_000);
    return () => clearInterval(t);
  }, []);

  const opps = useMemo(() => computeOpportunities(quotes), [quotes, now]);
  const radar = useMemo(() => computeRadar(quotes), [quotes, now]);
  const top = useMemo(() => scoreQuotes(quotes).slice(0, 3), [quotes]);
  const antiRec = useMemo(() => antiRecommendation(quotes), [quotes]);
  const timeline = useMemo(() => recentTimeline(loadActivities(), 10), [quotes, now]);

  const openQuote = (id: string) => navigate({ to: "/inbox", search: { open: id } });

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Comando ao vivo" />

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-success" />
              <h1 className="text-lg font-bold tracking-tight text-foreground">
                Command Center
              </h1>
              <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-primary">
                Ao vivo
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              Sua operação comercial em tempo real — decida em segundos.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/inbox"
              className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-card px-3 text-xs font-semibold text-foreground transition-smooth hover:bg-accent"
            >
              Abrir Inbox <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        {/* HERO — Oportunidades */}
        <section className="rounded-lg border bg-gradient-to-br from-primary/8 via-card to-card p-4 card-shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              Oportunidades
            </h2>
<span className="num text-[10px] text-muted-foreground">
              {clockTime}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <HeroStat label="Hoje" value={opps.today.toString()} icon={ActivityIcon} tone="primary" />
            <HeroStat
              label="Urgentes"
              value={opps.urgent.toString()}
              icon={Flame}
              tone={opps.urgent > 0 ? "danger" : "muted"}
            />
            <HeroStat
              label="Expiram em 30min"
              value={opps.expire30min.toString()}
              icon={Zap}
              tone={opps.expire30min > 0 ? "danger" : "muted"}
              pulse={opps.expire30min > 0}
            />
            <HeroStat
              label="Expiram hoje"
              value={opps.expireToday.toString()}
              icon={Clock}
              tone={opps.expireToday > 0 ? "warning" : "muted"}
            />
            <HeroStat
              label="Valor potencial"
              value={formatBRL(opps.potentialValue)}
              icon={Wallet}
              tone="success"
            />
            <HeroStat
              label="Margem prevista"
              value={formatPct(opps.predictedMargin)}
              icon={TrendingUp}
              tone={opps.predictedMargin >= 0.12 ? "success" : "danger"}
            />
            <HeroStat
              label="Pedidos previstos"
              value={formatBRL(opps.predictedOrders)}
              icon={Target}
              tone="success"
              subtitle={`Chance ${formatPct(opps.avgWinChance)}`}
            />
          </div>
        </section>

        {/* IA + Radar */}
        <div className="grid gap-3 lg:grid-cols-3">
          {/* IA Comercial */}
          <section className="rounded-lg border bg-card p-4 card-shadow lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10">
                  <Sparkles className="h-3.5 w-3.5 text-primary" />
                </span>
                <h2 className="text-sm font-bold tracking-tight text-foreground">
                  IA Comercial
                </h2>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Recomendações do momento
              </span>
            </div>

            {top.length === 0 && (
              <p className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
                Sem cotações abertas no momento. Aproveite para ligar para os 3 melhores clientes A.
              </p>
            )}

            <ol className="space-y-2">
              {top.map((s, i) => {
                const sla = slaState(s.quote.sla_deadline);
                return (
                  <li key={s.quote.id}>
                    <button
                      type="button"
                      onClick={() => openQuote(s.quote.id)}
                      className="w-full rounded-md border bg-background p-3 text-left transition-smooth hover:border-primary hover:bg-accent/40"
                    >
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success/10 text-[11px] font-bold text-success">
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold text-foreground">
                              {s.quote.customer_name}
                            </span>
                            <span className="rounded bg-success/10 px-1.5 py-0.5 text-[10px] font-bold text-success">
                              {Math.round(s.winChance * 100)}%
                            </span>
                            <span
                              className={cn(
                                "num text-[10px] font-semibold",
                                sla.tone === "danger"
                                  ? "text-danger"
                                  : sla.tone === "warning"
                                  ? "text-warning-foreground"
                                  : "text-muted-foreground",
                              )}
                            >
                              SLA {sla.label}
                            </span>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">{s.reason}</p>
                        </div>
                        <div className="text-right">
                          <div className="num text-sm font-bold text-foreground">
                            {formatBRL(s.expectedProfit)}
                          </div>
                          <div className="text-[10px] text-muted-foreground">lucro esperado</div>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ol>

            {antiRec && (
              <div className="mt-3 rounded-md border border-danger/30 bg-danger/5 p-3">
                <div className="flex items-start gap-2">
                  <AlertOctagon className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-danger">
                        Anti-recomendação
                      </span>
                      <button
                        type="button"
                        onClick={() => openQuote(antiRec.quote.id)}
                        className="truncate text-sm font-semibold text-foreground underline-offset-2 hover:underline"
                      >
                        {antiRec.quote.customer_name}
                      </button>
                      <span className="rounded bg-danger/10 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                        {Math.round(antiRec.winChance * 100)}%
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {antiRec.reason}. Considere despriorizar e focar nos 3 acima.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Radar */}
          <section className="rounded-lg border bg-card p-4 card-shadow">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight text-foreground">Radar hoje</h2>
              <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                <span className="inline-flex h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
                tempo real
              </span>
            </div>
            <ul className="space-y-1.5 text-sm">
              <RadarRow label="Novas RFQs" value={radar.novas} tone="primary" />
              <RadarRow label="Respondidas" value={radar.respondidas} />
              <RadarRow label="Em negociação" value={radar.negociacao} tone="warning" />
              <RadarRow label="Enviadas" value={radar.enviadas} />
              <RadarRow label="Ganhas" value={radar.ganhas} tone="success" />
              <RadarRow label="Perdidas" value={radar.perdidas} tone="danger" />
            </ul>
          </section>
        </div>

        {/* Timeline */}
        <section className="rounded-lg border bg-card p-4 card-shadow">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-bold tracking-tight text-foreground">Timeline ao vivo</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Últimos eventos
            </span>
          </div>
          {timeline.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma atividade recente.</p>
          )}
          <ol className="relative space-y-2 border-l border-border pl-4">
            {timeline.map((a) => (
              <li key={a.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 inline-flex h-2 w-2 rounded-full bg-primary" />
                <button
                  type="button"
                  onClick={() => openQuote(a.quote_id)}
                  className="w-full rounded-md p-1.5 text-left transition-smooth hover:bg-accent/50"
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs text-foreground">{a.message}</span>
                    <span className="num shrink-0 text-[10px] text-muted-foreground">
                      {new Date(a.created_at).toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}

function HeroStat({
  label,
  value,
  icon: Icon,
  tone = "muted",
  subtitle,
  pulse,
}: {
  label: string;
  value: string;
  icon: typeof ActivityIcon;
  tone?: "primary" | "success" | "danger" | "warning" | "muted";
  subtitle?: string;
  pulse?: boolean;
}) {
  const toneMap = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning-foreground",
    muted: "text-muted-foreground",
  } as const;
  return (
    <div className="rounded-md border bg-card/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-3.5 w-3.5", toneMap[tone], pulse && "animate-pulse")} />
      </div>
      <div className={cn("num mt-1 truncate text-lg font-bold", toneMap[tone])}>{value}</div>
      {subtitle && <div className="text-[10px] text-muted-foreground">{subtitle}</div>}
    </div>
  );
}

function RadarRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "primary" | "success" | "danger" | "warning";
}) {
  const toneMap = {
    primary: "text-primary",
    success: "text-success",
    danger: "text-danger",
    warning: "text-warning-foreground",
  } as const;
  return (
    <li className="flex items-center justify-between border-b border-border/50 pb-1.5 last:border-0 last:pb-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("num text-sm font-bold", tone ? toneMap[tone] : "text-foreground")}>
        {value}
      </span>
    </li>
  );
}
