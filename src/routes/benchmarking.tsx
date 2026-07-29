import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { BarChart3, ShieldCheck, TrendingDown, TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { PermissionGate } from "@/components/medical/permission-gate";
import { Badge } from "@/components/ui/badge";
import { useQuotes } from "@/hooks/use-quotes";
import { compareByRegion } from "@/lib/medical/benchmarks";
import { computeRegionalFlywheel } from "@/lib/medical/regional-flywheel";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/benchmarking")({
  head: () => ({
    meta: [
      { title: "Benchmarking anonimizado — USE Medical" },
      { name: "description", content: "Compare margem, ticket médio e win-rate contra a média da rede USE, anonimizada por região." },
      { property: "og:title", content: "Benchmarking anonimizado — USE Medical" },
      { property: "og:description", content: "Sua operação vs. a rede USE Medical, sem expor identidade de nenhum distribuidor." },
    ],
  }),
  component: BenchmarkingPage,
});

const brl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const pp = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)} pp`;
const delta = (n: number) => `${n >= 0 ? "+" : ""}${(n * 100).toFixed(1)}%`;

function BenchmarkingPage() {
  return (
    <PermissionGate perm="quotes.view" title="Benchmarking restrito">
      <BenchmarkingInner />
    </PermissionGate>
  );
}

function BenchmarkingInner() {
  const { quotes } = useQuotes();
  const comparisons = useMemo(() => compareByRegion(quotes), [quotes]);
  const flywheel = useMemo(() => computeRegionalFlywheel(quotes), [quotes]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div>
          <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
            <BarChart3 className="h-5 w-5 text-brand" /> Benchmarking anonimizado
          </h1>
          <p className="text-xs text-muted-foreground">
            Sua operação comparada à rede USE Medical por região. Nenhum distribuidor é
            identificado — só agregados (média, contagem, delta).
          </p>
        </div>

        <div className="flex items-center gap-2 rounded-md border border-brand/30 bg-brand/5 p-3 text-[11px] text-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
          <span>
            Todos os valores da rede são calculados por região com <strong>n mínimo de 3</strong> e sample size exposto.
            Nomes, tenants ou vendedores nunca saem desta agregação.
          </span>
        </div>

        <section className="grid gap-3 lg:grid-cols-2">
          {comparisons.map((c) => {
            const fw = flywheel.find((f) => f.region === c.region);
            const marginBetter = c.marginDelta >= 0;
            const ticketBetter = c.ticketDelta >= 0;
            const winBetter = c.winRateDelta >= 0;
            return (
              <div key={c.region} className="rounded-lg border bg-card p-4 card-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-base font-semibold text-foreground">{c.region}</h2>
                    <p className="text-[11px] text-muted-foreground">
                      Sua amostra: {c.self.sampleSize} · Rede: {fw?.blended.sampleSize ?? c.market.sampleSize} distribuidores anonimizados
                    </p>
                  </div>
                  {(fw?.ownSample ?? 0) >= 3 && (
                    <Badge variant="outline" className="text-[10px]">
                      contribuindo p/ rede
                    </Badge>
                  )}
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  <Metric
                    label="Margem"
                    self={pct(c.self.avgMargin)}
                    market={pct(c.market.avgMargin)}
                    deltaText={pp(c.marginDelta)}
                    better={marginBetter}
                  />
                  <Metric
                    label="Ticket médio"
                    self={brl(c.self.avgTicket)}
                    market={brl(c.market.avgTicket)}
                    deltaText={delta(c.ticketDelta)}
                    better={ticketBetter}
                  />
                  <Metric
                    label="Win-rate"
                    self={pct(c.self.winRate)}
                    market={pct(c.market.winRate)}
                    deltaText={pp(c.winRateDelta)}
                    better={winBetter}
                  />
                </div>

                <div className="mt-3 rounded border bg-background p-2 text-[11px] text-muted-foreground">
                  Resposta média da rede: <strong className="text-foreground">{c.market.respHours.toFixed(1)}h</strong>
                  {fw && fw.ownSample >= 3 && (
                    <> · Blend regional (baseline + seu histórico): margem <strong className="text-foreground">{pct(fw.blended.avgMargin)}</strong></>
                  )}
                </div>
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
}

function Metric({
  label,
  self,
  market,
  deltaText,
  better,
}: {
  label: string;
  self: string;
  market: string;
  deltaText: string;
  better: boolean;
}) {
  const Icon = better ? TrendingUp : TrendingDown;
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-lg font-bold text-foreground">{self}</span>
        <span className={cn("inline-flex items-center gap-0.5 text-[11px] font-semibold", better ? "text-success" : "text-destructive")}>
          <Icon className="h-3 w-3" /> {deltaText}
        </span>
      </div>
      <div className="text-[10px] text-muted-foreground">rede {market}</div>
    </div>
  );
}
