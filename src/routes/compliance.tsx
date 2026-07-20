import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { listAllActiveOverrides } from "@/lib/medical/compliance-override";
import { PRODUCTS, TENANTS, tenantById } from "@/lib/medical/mock-data";
import { runRetentionJob } from "@/lib/medical/retention";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compliance")({
  head: () => ({
    meta: [
      { title: "Compliance por Tenant — USE Medical" },
      {
        name: "description",
        content:
          "Score consolidado de compliance: % de quotes com override, produtos sem teto CMED, retenção de dados e export CSV para auditoria ANVISA.",
      },
    ],
  }),
  component: () => (
    <PermissionGate perm="compliance.override" title="Compliance restrito">
      <CompliancePage />
    </PermissionGate>
  ),
});

interface TenantScore {
  tenant_id: string;
  name: string;
  quotes_total: number;
  quotes_stuck: number; // aguardando_precificacao + em_negociacao
  overrides_active: number;
  override_rate: number; // 0..1 sobre quotes_total
  score: number; // 0..100
}

function grade(score: number) {
  if (score >= 85) return { label: "A", tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" };
  if (score >= 70) return { label: "B", tone: "bg-lime-500/15 text-lime-700 border-lime-500/30" };
  if (score >= 55) return { label: "C", tone: "bg-amber-500/15 text-amber-700 border-amber-500/30" };
  return { label: "D", tone: "bg-red-500/15 text-red-700 border-red-500/30" };
}

function toCsv(rows: Array<Record<string, string | number>>): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function download(name: string, csv: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

function CompliancePage() {
  const { quotes, resetDemo } = useQuotes();
  const { scope, tenant } = useActiveTenant();
  const { config } = useTenantConfig(tenant?.id ?? null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const allOverrides = useMemo(() => listAllActiveOverrides(), [tick]);

  // Produtos sem teto CMED (dado global, mesmo em todos os tenants no mock).
  const productsWithoutCeiling = useMemo(
    () => PRODUCTS.filter((p) => !p.cmed_ceiling || p.cmed_ceiling <= 0),
    [],
  );

  const overridesInScope = useMemo(() => {
    const quoteIds = new Set(quotes.map((q) => q.id));
    return allOverrides.filter((o) => quoteIds.has(o.quote_id));
  }, [allOverrides, quotes]);

  const scores: TenantScore[] = useMemo(() => {
    const tenantsInScope = scope === "all" ? TENANTS : TENANTS.filter((t) => t.id === scope);
    return tenantsInScope.map((t) => {
      const qs = quotes.filter((q) => q.tenant_id === t.id);
      const overrides = overridesInScope.filter((o) =>
        qs.some((q) => q.id === o.quote_id),
      );
      const stuck = qs.filter(
        (q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao",
      ).length;
      const overrideRate = qs.length ? overrides.length / qs.length : 0;
      // Score: 100 base, -1 por % override, -2 por produto sem CMED, -0.5 por stuck.
      const rawScore =
        100 -
        overrideRate * 100 -
        productsWithoutCeiling.length * 2 -
        stuck * 0.5;
      return {
        tenant_id: t.id,
        name: t.name,
        quotes_total: qs.length,
        quotes_stuck: stuck,
        overrides_active: overrides.length,
        override_rate: overrideRate,
        score: Math.max(0, Math.min(100, Math.round(rawScore))),
      };
    });
  }, [quotes, overridesInScope, scope, productsWithoutCeiling]);

  const exportOverrides = () => {
    const quoteById = new Map(quotes.map((q) => [q.id, q]));
    const rows = overridesInScope.map((o) => {
      const q = quoteById.get(o.quote_id);
      return {
        created_at: o.created_at,
        expires_at: o.expires_at,
        tenant_id: q?.tenant_id ?? "",
        tenant_name: q ? tenantById(q.tenant_id).name : "",
        quote_id: o.quote_id,
        customer_name: q?.customer_name ?? "",
        sku: o.sku,
        manager_id: o.manager_id,
        reason: o.reason,
      };
    });
    if (!rows.length) return toast.info("Nenhum override ativo no escopo.");
    download(`use-medical-overrides-${Date.now()}.csv`, toCsv(rows));
    toast.success(`Exportado ${rows.length} override(s).`);
  };

  const runRetention = () => {
    const report = runRetentionJob({ dryRun: false });
    toast.success(
      `Retenção rodada: ${report.purged}/${report.scanned} quote(s) purgada(s).`,
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <TenantScopeBanner />
      <Toaster richColors position="top-right" />

      <main className="mx-auto max-w-[1400px] space-y-6 px-3 py-6 sm:px-6">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl font-bold tracking-tight">Compliance por Tenant</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Score consolidado, overrides ativos e política de retenção (Data Residency).
              Export CSV serve como evidência para auditoria ANVISA/LGPD.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={runRetention} className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Rodar retenção agora
            </Button>
            <Button size="sm" onClick={exportOverrides} className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export overrides (CSV)
            </Button>
          </div>
        </header>

        {/* Score cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {scores.map((s) => {
            const g = grade(s.score);
            return (
              <div key={s.tenant_id} className="rounded-xl border bg-card p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold">{s.name}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Retenção: {s.tenant_id === tenant?.id ? config.retention_days : 90}d
                    </div>
                  </div>
                  <div className={cn("rounded-md border px-2 py-1 text-lg font-bold leading-none", g.tone)}>
                    {g.label}
                  </div>
                </div>
                <div className="mb-2 flex items-baseline gap-1">
                  <span className="text-2xl font-bold tabular-nums">{s.score}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
                <dl className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <dt className="text-muted-foreground">Quotes</dt>
                    <dd className="font-semibold tabular-nums">{s.quotes_total}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Overrides</dt>
                    <dd className="font-semibold tabular-nums">{s.overrides_active}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Travadas</dt>
                    <dd className="font-semibold tabular-nums">{s.quotes_stuck}</dd>
                  </div>
                </dl>
                {s.override_rate > 0.1 && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700">
                    <ShieldAlert className="h-3 w-3" />
                    Taxa de override {(s.override_rate * 100).toFixed(1)}% — revisar produtos
                  </div>
                )}
              </div>
            );
          })}
        </section>

        {/* Produtos sem CMED */}
        <section className="rounded-xl border bg-card p-4">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            Produtos sem teto CMED
            <Badge variant="outline">{productsWithoutCeiling.length}</Badge>
          </h2>
          {productsWithoutCeiling.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Todos os produtos do catálogo têm teto CMED configurado. ✓
            </p>
          ) : (
            <ul className="grid gap-1.5 text-xs sm:grid-cols-2 lg:grid-cols-3">
              {productsWithoutCeiling.map((p) => (
                <li key={p.id} className="rounded border bg-background/60 p-2">
                  <div className="font-medium">{p.name}</div>
                  <code className="text-[10px] text-muted-foreground">{p.sku}</code>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Overrides ativos */}
        <section className="rounded-xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <h2 className="text-sm font-semibold">Overrides ativos no escopo</h2>
            <Badge variant="outline">{overridesInScope.length}</Badge>
          </div>
          {overridesInScope.length === 0 ? (
            <p className="p-4 text-xs text-muted-foreground">Nenhum override ativo.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-muted/40 text-left uppercase tracking-wider text-[10px] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2">Criado em</th>
                    <th className="px-3 py-2">Tenant</th>
                    <th className="px-3 py-2">Quote</th>
                    <th className="px-3 py-2">SKU</th>
                    <th className="px-3 py-2">Gestor</th>
                    <th className="px-3 py-2">Motivo</th>
                    <th className="px-3 py-2">Expira</th>
                  </tr>
                </thead>
                <tbody>
                  {overridesInScope.map((o) => {
                    const q = quotes.find((x) => x.id === o.quote_id);
                    return (
                      <tr key={`${o.quote_id}-${o.sku}`} className="border-t">
                        <td className="px-3 py-1.5 tabular-nums">{new Date(o.created_at).toLocaleString("pt-BR")}</td>
                        <td className="px-3 py-1.5">{q ? tenantById(q.tenant_id).name : "—"}</td>
                        <td className="px-3 py-1.5">
                          <div className="font-medium">{q?.customer_name ?? o.quote_id}</div>
                          <code className="text-[10px] text-muted-foreground">{o.quote_id}</code>
                        </td>
                        <td className="px-3 py-1.5"><code>{o.sku}</code></td>
                        <td className="px-3 py-1.5">{o.manager_id}</td>
                        <td className="px-3 py-1.5 max-w-[220px] truncate" title={o.reason}>{o.reason}</td>
                        <td className="px-3 py-1.5 tabular-nums text-muted-foreground">{new Date(o.expires_at).toLocaleString("pt-BR")}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
