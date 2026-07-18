import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CheckCircle2, Circle, Cloud, Database, FileCode, KeyRound, Layers, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { currentBackend } from "@/lib/medical/repo";

export const Route = createFileRoute("/cloud-readiness")({
  head: () => ({
    meta: [
      { title: "Cloud Readiness — USE Medical" },
      {
        name: "description",
        content:
          "Checklist de pré-ativação da Lovable Cloud: schema, RLS, migrations, secrets e cutover do localStorage para Postgres gerenciado.",
      },
    ],
  }),
  component: CloudReadinessPage,
});

type Check = {
  label: string;
  detail: string;
  status: "ready" | "pending" | "manual";
};

const MIGRATIONS: Array<{ file: string; purpose: string; ready: boolean }> = [
  { file: "supabase-schema.md", purpose: "Base: tenants, roles, quotes, produtos, SLA, commissions", ready: true },
  { file: "commissions_trigger.sql", purpose: "Cálculo server-side de margem/comissão", ready: true },
  { file: "inbox_views.sql", purpose: "Índices para filtros salvos", ready: true },
  { file: "audit_chain.sql", purpose: "Activity log imutável (djb2 hash-chain)", ready: true },
  { file: "ingestion_engine.sql", purpose: "ingest_log, quarantine_payloads, rate_limits", ready: true },
  { file: "pricing_engine.sql", purpose: "Colunas de governança em products + price_cache", ready: true },
  { file: "governance.sql", purpose: "permission_overrides + effective_permissions()", ready: true },
  { file: "tenant_config.sql", purpose: "Overrides de margem/SLA/webhooks por tenant", ready: true },
];

const SECRETS: Array<{ key: string; purpose: string }> = [
  { key: "INGEST_HMAC_SECRET", purpose: "Assina POST /api/v1/ingest (portais/webhooks)" },
  { key: "USE_SISTEMAS_HMAC_SECRET", purpose: "Verifica callbacks do mock Use Sistemas" },
  { key: "WEBHOOK_SECRET", purpose: "Outbound webhooks (Slack/WhatsApp/parceiros)" },
];

const LOCALSTORAGE_KEYS = [
  "usemed_quotes", "usemed_products", "usemed_tenants", "usemed_activity",
  "usemed_api_keys", "usemed_erp_mappings", "usemed_inbox_views",
  "usemed_quarantine", "usemed_ingest_log", "usemed_tenant_config",
  "usemed_permission_overrides", "usemed_price_cache",
];

function CloudReadinessPage() {
  const preFlight: Check[] = useMemo(
    () => [
      { label: "Schema base documentado", detail: "docs/supabase-schema.md (373 linhas, RLS completo)", status: "ready" },
      { label: "8 migrations idempotentes", detail: "Todas com GRANTs + ENABLE RLS + policies por tenant", status: "ready" },
      { label: "Hash-chain de auditoria portável", detail: "djb2 replicado em SQL — mesmo algoritmo do front", status: "ready" },
      { label: "Server functions com requireSupabaseAuth", detail: "Trocar hooks localStorage por createServerFn + TanStack Query", status: "pending" },
      { label: "Seed do tenant piloto + tenant_members", detail: "Executar antes do primeiro SELECT autenticado", status: "manual" },
      { label: "Rotação de segredos HMAC", detail: "Gerar novos valores no cofre da Cloud e revogar mocks", status: "manual" },
      { label: "Backup do localStorage (Inbox → ⋯ → exportar JSON)", detail: "Por usuário-piloto antes do cutover", status: "manual" },
    ],
    [],
  );

  const ready = preFlight.filter((c) => c.status === "ready").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => { /* noop */ }} />

      <main className="mx-auto max-w-[1400px] px-3 py-6 sm:px-6">
        <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="mb-1 flex items-center gap-2">
              <Cloud className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-bold tracking-tight">Cloud Readiness</h1>
            </div>
            <p className="max-w-2xl text-sm text-muted-foreground">
              Checklist de pré-ativação. O código já roda em <code>localStorage</code>; ao ligar a Lovable
              Cloud, aplique as migrations na ordem abaixo e troque os hooks pelos server functions.
            </p>
          </div>
          <Badge variant="outline" className="border-brand/40 text-brand">
            {ready}/{preFlight.length} prontos
          </Badge>
        </header>

        <section className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Layers className="h-4 w-4" /> Repository backend ativo
          </h2>
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              className={cn(
                "text-xs uppercase tracking-wider",
                currentBackend() === "local"
                  ? "bg-amber-500/15 text-amber-700"
                  : "bg-emerald-500/15 text-emerald-700",
              )}
            >
              {currentBackend() === "local" ? "localStorage" : "Supabase (Cloud)"}
            </Badge>
            <p className="text-xs text-muted-foreground">
              Feature flag <code>VITE_USE_CLOUD</code>. Hooks consomem <code>getRepo()</code> —
              trocar backend = trocar 1 provider (nenhuma tela precisa mudar).
            </p>
          </div>
        </section>


        <section className="mb-6 rounded-xl border bg-card p-4 sm:p-5">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
            <ShieldCheck className="h-4 w-4" /> Pré-flight
          </h2>
          <ul className="divide-y">
            {preFlight.map((c) => (
              <li key={c.label} className="flex items-start gap-3 py-2.5">
                {c.status === "ready" ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <Circle className={cn("mt-0.5 h-4 w-4 shrink-0", c.status === "manual" ? "text-brand" : "text-muted-foreground")} />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium leading-tight">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.detail}</div>
                </div>
                <Badge
                  variant="secondary"
                  className={cn(
                    "shrink-0 text-[10px] uppercase tracking-wider",
                    c.status === "ready" && "bg-emerald-500/15 text-emerald-600",
                    c.status === "pending" && "bg-amber-500/15 text-amber-700",
                    c.status === "manual" && "bg-brand/15 text-brand",
                  )}
                >
                  {c.status}
                </Badge>
              </li>
            ))}
          </ul>
        </section>

        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-xl border bg-card p-4 sm:p-5">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
              <FileCode className="h-4 w-4" /> Ordem de execução das migrations
            </h2>
            <ol className="space-y-2">
              {MIGRATIONS.map((m, i) => (
                <li key={m.file} className="flex items-start gap-3 rounded-md border bg-background/60 p-2.5">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <code className="block truncate text-xs font-semibold">docs/migrations/{m.file}</code>
                    <p className="text-xs text-muted-foreground">{m.purpose}</p>
                  </div>
                  {m.ready && <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />}
                </li>
              ))}
            </ol>
          </section>

          <div className="space-y-4">
            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <KeyRound className="h-4 w-4" /> Segredos a provisionar
              </h2>
              <ul className="space-y-2">
                {SECRETS.map((s) => (
                  <li key={s.key} className="rounded-md border bg-background/60 p-2.5">
                    <code className="text-xs font-semibold text-brand">{s.key}</code>
                    <p className="text-xs text-muted-foreground">{s.purpose}</p>
                  </li>
                ))}
              </ul>
            </section>

            <section className="rounded-xl border bg-card p-4 sm:p-5">
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Database className="h-4 w-4" /> Cutover de dados (localStorage → Postgres)
              </h2>
              <p className="mb-2 text-xs text-muted-foreground">
                Exporte as chaves abaixo por usuário-piloto (Inbox → ⋯ → exportar JSON) e importe via server
                function <code>seedFromExport()</code> após a migração.
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LOCALSTORAGE_KEYS.map((k) => (
                  <code
                    key={k}
                    className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground"
                  >
                    {k}
                  </code>
                ))}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
