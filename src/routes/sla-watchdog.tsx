import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { Radio, Timer, Zap, CheckCheck } from "lucide-react";
import { toast } from "sonner";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { EmptyState } from "@/components/ui/state-panels";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { elapsedSincePortal, SOURCE_PLATFORM_LABEL } from "@/lib/medical/ingestion";
import type { SourcePlatform } from "@/lib/medical/types";

// SLA Watchdog — mostra a latência "portal → resposta do vendedor" para
// cotações capturadas pelo Ingestion Engine. Toda cotação `pending_review`
// ou já assumida cujo portal_meta está preenchido entra aqui.

export const Route = createFileRoute("/sla-watchdog")({
  head: () => ({
    meta: [
      { title: "SLA Watchdog — USE Medical" },
      { name: "description", content: "Monitoramento em tempo real do tempo de resposta a RFQs de portais externos." },
      { property: "og:title", content: "SLA Watchdog — USE Medical" },
      { property: "og:description", content: "Latência portal → resposta do vendedor, com metas por origem." },
    ],
  }),
  component: SlaWatchdogPage,
});

interface Row {
  id: string;
  customer: string;
  platform: SourcePlatform;
  ref: string;
  openedAt: string;
  ingestedAt: string;
  respondedAt?: string;
  latencyMs: number;      // portal → resposta (ou agora)
  captureLagMs: number;   // portal → ingest
  status: "pending" | "responded" | "breached";
}

const TARGET_MS = 30 * 60_000; // 30 min: meta interna portal→resposta

function SlaWatchdogPage() {
  const { quotes, hydrated, markPortalResponded } = useQuotes();
  const { tenant, hydrated: tenantHydrated } = useActiveTenant();

  const rows = useMemo<Row[]>(() => {
    if (!hydrated) return [];
    const now = Date.now();
    return quotes
      .filter((q) => q.portal_meta)
      .map((q) => {
        const meta = q.portal_meta!;
        const openedAt = new Date(meta.portal_opened_at).getTime();
        const ingestedAt = new Date(meta.ingested_at).getTime();
        const respondedAt = meta.response_at ? new Date(meta.response_at).getTime() : undefined;
        const endpoint = respondedAt ?? now;
        const latency = endpoint - openedAt;
        const status: Row["status"] = respondedAt
          ? "responded"
          : latency > TARGET_MS
          ? "breached"
          : "pending";
        return {
          id: q.id,
          customer: q.customer_name,
          platform: meta.source_platform,
          ref: meta.portal_reference,
          openedAt: meta.portal_opened_at,
          ingestedAt: meta.ingested_at,
          respondedAt: meta.response_at,
          latencyMs: latency,
          captureLagMs: ingestedAt - openedAt,
          status,
        };
      })
      .sort((a, b) => b.latencyMs - a.latencyMs);
  }, [quotes, hydrated]);

  const kpis = useMemo(() => {
    if (rows.length === 0) return { pending: 0, breached: 0, avgLatency: 0, avgLag: 0 };
    const pending = rows.filter((r) => r.status !== "responded").length;
    const breached = rows.filter((r) => r.status === "breached").length;
    const avgLatency = rows.reduce((s, r) => s + r.latencyMs, 0) / rows.length;
    const avgLag = rows.reduce((s, r) => s + r.captureLagMs, 0) / rows.length;
    return { pending, breached, avgLatency, avgLag };
  }, [rows]);

  const fmt = (ms: number) => elapsedSincePortal(new Date(Date.now() - ms).toISOString());

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => window.location.reload()} />
      <main className="mx-auto max-w-[1400px] space-y-3 px-3 py-3 sm:px-4">
        <TenantScopeBanner />

        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
              <Radio className="h-4 w-4 text-brand" /> SLA Watchdog
            </h1>
            <p className="text-xs text-muted-foreground">
              Latência entre a abertura da RFQ no portal e a primeira resposta do vendedor.{" "}
              Meta interna: <strong className="text-foreground">≤ 30 min</strong>.
            </p>
          </div>
          <Link
            to="/integracoes"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            Configurar conectores de portal →
          </Link>
        </header>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <Kpi label="Aguardando" value={String(kpis.pending)} tone={kpis.pending > 0 ? "warn" : "ok"} />
          <Kpi label="SLA rompido" value={String(kpis.breached)} tone={kpis.breached > 0 ? "danger" : "ok"} />
          <Kpi label="Latência média" value={rows.length ? fmt(kpis.avgLatency) : "—"} />
          <Kpi label="Lag de captura médio" value={rows.length ? fmt(kpis.avgLag) : "—"} />
        </div>

        {tenantHydrated && rows.length === 0 && (
          <EmptyState
            message={
              tenant
                ? `Nenhuma cotação de portal no escopo de ${tenant.name}. Use o simulador em Integrações para gerar eventos.`
                : "Ative um conector de portal em Integrações e envie um payload de teste."
            }
          />
        )}

        {rows.length > 0 && (
          <div className="overflow-hidden rounded-lg border bg-card card-shadow">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Portal</th>
                  <th className="px-2 py-1.5 text-left">Ref.</th>
                  <th className="px-2 py-1.5 text-left">Cliente</th>
                  <th className="px-2 py-1.5 text-right">Aberto no portal</th>
                  <th className="px-2 py-1.5 text-right">Lag captura</th>
                  <th className="px-2 py-1.5 text-right">Latência total</th>
                  <th className="px-2 py-1.5 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-semibold text-foreground">
                      {SOURCE_PLATFORM_LABEL[r.platform]}
                    </td>
                    <td className="px-2 py-1.5 font-mono text-muted-foreground">{r.ref}</td>
                    <td className="px-2 py-1.5 text-foreground">{r.customer}</td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground">
                      há {elapsedSincePortal(r.openedAt)}
                    </td>
                    <td className="px-2 py-1.5 text-right text-muted-foreground num">{fmt(r.captureLagMs)}</td>
                    <td className="px-2 py-1.5 text-right num">
                      <span
                        className={
                          r.status === "responded"
                            ? "font-semibold text-success"
                            : r.status === "breached"
                            ? "font-semibold text-destructive"
                            : "font-semibold text-warning-foreground"
                        }
                      >
                        {fmt(r.latencyMs)}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {r.status === "responded" ? (
                        <span className="inline-flex items-center gap-1 text-[10px] text-success">
                          <Zap className="h-3 w-3" /> respondida
                        </span>
                      ) : (
                        <button
                          onClick={() => markPortalResponded(r.id)}
                          className="inline-flex h-6 items-center gap-1 rounded border border-primary/30 bg-primary/5 px-2 text-[10px] font-semibold text-primary hover:bg-primary/10"
                        >
                          <Timer className="h-3 w-3" /> assumir agora
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}

function Kpi({ label, value, tone = "neutral" }: { label: string; value: string; tone?: "ok" | "warn" | "danger" | "neutral" }) {
  const toneCls =
    tone === "ok"
      ? "text-success"
      : tone === "warn"
      ? "text-warning-foreground"
      : tone === "danger"
      ? "text-destructive"
      : "text-foreground";
  return (
    <div className="rounded-lg border bg-card p-2.5 card-shadow">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={`mt-0.5 text-xl font-bold num ${toneCls}`}>{value}</div>
    </div>
  );
}
