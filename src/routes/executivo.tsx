import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, DollarSign, ShieldCheck, TrendingUp, Users, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AppShell } from "@/components/medical/app-shell";
import { useQuotes } from "@/hooks/use-quotes";
import { computeKpis, leaderboard } from "@/lib/medical/analytics";
import { computeCommission } from "@/lib/medical/commission";
import { quoteTotals } from "@/lib/medical/pricing";
import { slaState } from "@/components/medical/sla-indicator";
import { loadActivities } from "@/lib/medical/activity";
import { verifyChain } from "@/lib/medical/audit-chain";
import { listAllActiveOverrides } from "@/lib/medical/compliance-override";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import type { Quote } from "@/lib/medical/types";

export const Route = createFileRoute("/executivo")({
  head: () => ({
    meta: [
      { title: "Painel Executivo — USE Medical" },
      { name: "description", content: "Visão consolidada de receita em risco, comissão projetada e integridade operacional." },
    ],
  }),
  component: ExecutivePanel,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

function ExecutivePanel() {
  const { quotes, resetDemo } = useQuotes();
  const { tenant } = useActiveTenant();

  const data = useMemo(() => {
    const kpis = computeKpis(quotes);
    const open = quotes.filter((q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao" || q.status === "enviado");
    const atRisk = open.filter((q) => slaState(q.sla_deadline).tone !== "ok");
    const revenueAtRisk = atRisk.reduce((s, q) => s + quoteTotals(q.items).revenue, 0);

    let commissionProjected = 0;
    let commissionWon = 0;
    for (const q of quotes) {
      const c = computeCommission(q);
      if (q.status === "ganho") commissionWon += c.total;
      else if (q.status !== "perdido") commissionProjected += c.total;
    }

    const byClient = new Map<string, { count: number; revenue: number }>();
    for (const q of quotes) {
      const cur = byClient.get(q.customer_name) ?? { count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += quoteTotals(q.items).revenue;
      byClient.set(q.customer_name, cur);
    }
    const topClients = [...byClient.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 6);

    const activities = loadActivities();
    const scoped = tenant ? activities.filter((a) => {
      // activity storage não é escopada por tenant → derivar via quote id
      const q = quotes.find((x) => x.id === a.quote_id);
      return q?.tenant_id === tenant.id;
    }) : activities;
    const chain = verifyChain(scoped);
    const integrity = chain.total === 0 ? 1 : chain.verified / chain.total;
    const overrides = listAllActiveOverrides().filter((o) => quotes.some((q) => q.id === o.quote_id));

    const lb = leaderboard(quotes).slice(0, 5);

    return { kpis, revenueAtRisk, atRiskCount: atRisk.length, commissionProjected, commissionWon, topClients, integrity, chain, overrides, lb, openQuotes: open };
  }, [quotes, tenant]);

  return (
    <AppShell onReset={resetDemo}>
      <div className="mx-auto max-w-[1600px] space-y-5 px-3 py-5 sm:px-4">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-foreground">Painel Executivo</h1>
            <p className="text-sm text-muted-foreground">
              {tenant ? `${tenant.name} · ${tenant.region ?? "—"}` : "Todos os tenants"} · Visão consolidada
            </p>
          </div>
          <Badge variant="outline" className="border-brand/40 bg-brand/10 text-brand">
            Somente leitura · Gestor
          </Badge>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <HeroCard
            icon={AlertTriangle}
            label="Receita em risco (SLA)"
            value={brl(data.revenueAtRisk)}
            hint={`${data.atRiskCount} cotações fora do SLA`}
            tone={data.revenueAtRisk > 0 ? "danger" : "ok"}
          />
          <HeroCard
            icon={DollarSign}
            label="Comissão projetada"
            value={brl(data.commissionProjected)}
            hint={`Ganho MTD: ${brl(data.commissionWon)}`}
            tone="brand"
          />
          <HeroCard
            icon={TrendingUp}
            label="Pipeline aberto"
            value={brl(data.kpis.pipeline)}
            hint={`${data.kpis.activeCount} cotações ativas · Ticket ${brl(data.kpis.avgTicket)}`}
            tone="ok"
          />
          <HeroCard
            icon={ShieldCheck}
            label="Integridade auditoria"
            value={pct(data.integrity)}
            hint={`${data.chain.verified}/${data.chain.total} elos íntegros`}
            tone={data.integrity < 1 ? "danger" : "ok"}
          />
        </section>

        <section className="grid gap-3 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-brand" /> Top clientes (receita agregada)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data.topClients.length === 0 && (
                <p className="py-6 text-center text-xs text-muted-foreground">Sem cotações no escopo atual.</p>
              )}
              {data.topClients.map((c) => {
                const max = data.topClients[0]?.revenue || 1;
                return (
                  <div key={c.name} className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-foreground">{c.name}</span>
                      <span className="tabular-nums text-muted-foreground">
                        {c.count} cot. · <span className="font-semibold text-foreground">{brl(c.revenue)}</span>
                      </span>
                    </div>
                    <Progress value={(c.revenue / max) * 100} className="h-1.5" />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Zap className="h-4 w-4 text-brand" /> Saúde operacional
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              <MetricRow label="Win rate" value={pct(data.kpis.winRate)} />
              <MetricRow label="Margem média" value={pct(data.kpis.avgMargin)} tone={data.kpis.avgMargin < 0.12 ? "danger" : "ok"} />
              <MetricRow label="Saúde SLA" value={pct(data.kpis.slaHealth)} tone={data.kpis.slaHealth < 0.7 ? "danger" : "ok"} />
              <MetricRow label="Overrides ativos" value={String(data.overrides.length)} tone={data.overrides.length > 3 ? "warn" : "ok"} />
              <MetricRow label="Cotações abertas" value={String(data.openQuotes.length)} />
            </CardContent>
          </Card>
        </section>

        <section>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Leaderboard — vendedores</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/60 text-[10px] uppercase tracking-wider text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left">Vendedor</th>
                      <th className="px-3 py-2 text-right">Cotações</th>
                      <th className="px-3 py-2 text-right">Pipeline</th>
                      <th className="px-3 py-2 text-right">Margem</th>
                      <th className="px-3 py-2 text-right">Conversão</th>
                      <th className="px-3 py-2 text-right">Comissão ganha</th>
                      <th className="px-3 py-2 text-right">Comissão projetada</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.lb.map((row) => (
                      <tr key={row.owner?.id} className="border-t border-border/60 hover:bg-muted/30">
                        <td className="px-3 py-2 font-medium text-foreground">{row.owner?.name}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{row.count}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{brl(row.pipeline)}</td>
                        <td className={`px-3 py-2 text-right tabular-nums ${row.avgMargin < 0.12 ? "text-destructive" : ""}`}>{pct(row.avgMargin)}</td>
                        <td className="px-3 py-2 text-right tabular-nums">{pct(row.conversion)}</td>
                        <td className="px-3 py-2 text-right tabular-nums font-semibold text-emerald-600">{brl(row.commissionWon)}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-brand">{brl(row.commissionPipeline)}</td>
                      </tr>
                    ))}
                    {data.lb.length === 0 && (
                      <tr><td colSpan={7} className="px-3 py-6 text-center text-muted-foreground">Sem dados no escopo.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}

function HeroCard({
  icon: Icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone: "ok" | "warn" | "danger" | "brand";
}) {
  const styles: Record<string, string> = {
    ok: "border-emerald-500/30 bg-emerald-50/40",
    warn: "border-amber-500/40 bg-amber-50/50",
    danger: "border-destructive/40 bg-destructive/5",
    brand: "border-brand/40 bg-brand/5",
  };
  const iconStyles: Record<string, string> = {
    ok: "text-emerald-600",
    warn: "text-amber-600",
    danger: "text-destructive",
    brand: "text-brand",
  };
  return (
    <Card className={styles[tone]}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className={`h-3.5 w-3.5 ${iconStyles[tone]}`} />
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold tabular-nums text-foreground">{value}</div>
        {hint && <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>}
      </CardContent>
    </Card>
  );
}

function MetricRow({ label, value, tone = "ok" }: { label: string; value: string; tone?: "ok" | "warn" | "danger" }) {
  const color = tone === "danger" ? "text-destructive" : tone === "warn" ? "text-amber-600" : "text-foreground";
  return (
    <div className="flex items-center justify-between border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={`tabular-nums font-semibold ${color}`}>{value}</span>
    </div>
  );
}

// silence unused import when Quote type isn't referenced structurally
export type _q = Quote;
