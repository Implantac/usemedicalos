import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, FileSearch, Filter, ShieldAlert, ShieldCheck } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { TENANTS } from "@/lib/medical/mock-data";
import { loadActivities, type Activity, type ActivityType } from "@/lib/medical/activity";
import { verifyChain } from "@/lib/medical/audit-chain";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/auditoria")({
  head: () => ({
    meta: [
      { title: "Auditoria — USE Medical Commercial OS" },
      { name: "description", content: "Trilha de auditoria imutável (hash-chain) de todas as atividades de cotação." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: () => (
    <PermissionGate perm="governance.manage" title="Auditoria restrita">
      <AuditoriaPage />
    </PermissionGate>
  ),
});

const TYPE_LABEL: Record<ActivityType, string> = {
  created: "Criação",
  status_changed: "Mudança de status",
  item_updated: "Item atualizado",
  item_removed: "Item removido",
  price_suggested: "Preço sugerido (IA)",
  notes_updated: "Notas atualizadas",
  pdf_generated: "PDF gerado",
  sent_use_sistemas: "Enviado ao ERP",
  compliance_override: "Compliance override",
  compliance_override_revoked: "Override revogado",
  client_tier_changed: "Tier alterado",
  ingested_from_portal: "Ingestão de portal",
  portal_response_taken: "Resposta tomada",
};

const HIGH_RISK: ActivityType[] = [
  "compliance_override",
  "compliance_override_revoked",
  "client_tier_changed",
];

function AuditoriaPage() {
  const { resetDemo, quotes: scopedQuotes } = useQuotes();
  const { scope, tenant } = useActiveTenant();

  const [type, setType] = useState<"all" | ActivityType>("all");
  const [search, setSearch] = useState("");
  const [onlyRisk, setOnlyRisk] = useState(false);

  const allActivities = useMemo<Activity[]>(() => loadActivities(), []);
  const chain = useMemo(() => verifyChain(allActivities), [allActivities]);
  const brokenSet = useMemo(
    () => new Set(chain.broken.map((b) => b.activityId)),
    [chain.broken],
  );

  const quoteIndex = useMemo(() => {
    const m = new Map<string, { tenantId: string; customer: string }>();
    for (const q of scopedQuotes) m.set(q.id, { tenantId: q.tenant_id, customer: q.customer_name });
    return m;
  }, [scopedQuotes]);

  const tenantIndex = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of TENANTS) m.set(t.id, t.name);
    return m;
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allActivities.filter((a) => {
      const meta = quoteIndex.get(a.quote_id);
      if (scope !== "all" && meta && meta.tenantId !== scope) return false;
      // Se o registro pertence a quote fora do escopo carregado, esconde no modo tenant.
      if (scope !== "all" && !meta) return false;
      if (type !== "all" && a.type !== type) return false;
      if (onlyRisk && !HIGH_RISK.includes(a.type)) return false;
      if (q) {
        const hay = `${a.message} ${a.quote_id} ${meta?.customer ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [allActivities, quoteIndex, scope, type, onlyRisk, search]);

  function exportCsv() {
    const rows = [
      ["timestamp", "quote_id", "tenant", "cliente", "tipo", "mensagem", "prev_hash", "hash", "integridade"],
      ...filtered.map((a) => {
        const meta = quoteIndex.get(a.quote_id);
        return [
          a.created_at,
          a.quote_id,
          meta ? tenantIndex.get(meta.tenantId) ?? meta.tenantId : "—",
          meta?.customer ?? "—",
          TYPE_LABEL[a.type] ?? a.type,
          a.message.replace(/"/g, '""'),
          a.prev_hash ?? "",
          a.hash ?? "",
          brokenSet.has(a.id) ? "TAMPERED" : "OK",
        ];
      }),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exportado ${filtered.length} evento(s).`);
  }

  const brokenVisible = filtered.filter((a) => brokenSet.has(a.id)).length;

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <TenantScopeBanner />

        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold">
              <FileSearch className="h-5 w-5 text-brand" /> Trilha de Auditoria
            </h1>
            <p className="text-xs text-muted-foreground">
              Registro imutável (hash-chain) de todas as atividades{" "}
              {scope !== "all" && tenant ? `em ${tenant.name}` : "em todos os tenants"}. Exportação
              CSV inclui hashes para verificação externa.
            </p>
          </div>
          <Button size="sm" onClick={exportCsv} className="gap-1.5">
            <Download className="h-4 w-4" /> Exportar CSV ({filtered.length})
          </Button>
        </div>

        <div
          className={cn(
            "mb-3 flex items-center gap-2 rounded-md border px-3 py-2 text-xs font-semibold",
            chain.valid
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/50 bg-danger/10 text-danger",
          )}
        >
          {chain.valid ? <ShieldCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
          {chain.valid
            ? `Cadeia íntegra — ${chain.ok}/${chain.total} elos verificados.`
            : `Cadeia comprometida — ${chain.broken.length} elo(s) quebrado(s) de ${chain.total}.`}
        </div>

        <div className="mb-3 grid gap-2 rounded-lg border bg-card p-3 card-shadow sm:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Filter className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por mensagem, quote_id ou cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 pl-7 text-xs"
            />
          </div>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as typeof type)}
            className="h-8 rounded-md border bg-background px-2 text-xs"
          >
            <option value="all">Todos os tipos</option>
            {(Object.keys(TYPE_LABEL) as ActivityType[]).map((t) => (
              <option key={t} value={t}>
                {TYPE_LABEL[t]}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 rounded-md border px-2 text-xs">
            <input
              type="checkbox"
              checked={onlyRisk}
              onChange={(e) => setOnlyRisk(e.target.checked)}
            />
            Alto risco
          </label>
          <div className="flex items-center rounded-md border px-2 text-[10px] font-semibold text-muted-foreground">
            {brokenVisible > 0 ? (
              <span className="text-danger">{brokenVisible} tampered</span>
            ) : (
              <span className="text-success">Sem adulterações no filtro</span>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card card-shadow">
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-muted/60 text-[10px] uppercase text-muted-foreground">
                <tr>
                  <th className="px-2 py-1.5 text-left">Quando</th>
                  <th className="px-2 py-1.5 text-left">Tenant</th>
                  <th className="px-2 py-1.5 text-left">Cotação</th>
                  <th className="px-2 py-1.5 text-left">Tipo</th>
                  <th className="px-2 py-1.5 text-left">Mensagem</th>
                  <th className="px-2 py-1.5 text-left">Hash</th>
                  <th className="px-2 py-1.5 text-left">Integridade</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                      Nenhuma atividade corresponde ao filtro.
                    </td>
                  </tr>
                )}
                {filtered.map((a) => {
                  const meta = quoteIndex.get(a.quote_id);
                  const tenantName = meta ? tenantIndex.get(meta.tenantId) ?? meta.tenantId : "—";
                  const isBroken = brokenSet.has(a.id);
                  const isRisk = HIGH_RISK.includes(a.type);
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        "border-t hover:bg-muted/30",
                        isBroken && "bg-danger/5",
                        isRisk && !isBroken && "bg-warn/5",
                      )}
                    >
                      <td className="whitespace-nowrap px-2 py-1 text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR")}
                      </td>
                      <td className="px-2 py-1">{tenantName}</td>
                      <td className="px-2 py-1">
                        {meta ? (
                          <Link
                            to="/"
                            className="font-mono text-[10px] text-primary underline-offset-2 hover:underline"
                            title={meta.customer}
                          >
                            {a.quote_id.slice(0, 10)}
                          </Link>
                        ) : (
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {a.quote_id.slice(0, 10)}
                          </span>
                        )}
                      </td>
                      <td className="px-2 py-1">
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 text-[10px] font-semibold",
                            isRisk
                              ? "bg-warn/15 text-warn"
                              : "bg-muted text-muted-foreground",
                          )}
                        >
                          {TYPE_LABEL[a.type] ?? a.type}
                        </span>
                      </td>
                      <td className="px-2 py-1">{a.message}</td>
                      <td className="px-2 py-1 font-mono text-[10px] text-muted-foreground">
                        {a.hash?.slice(0, 14) ?? "—"}
                      </td>
                      <td className="px-2 py-1">
                        {isBroken ? (
                          <span className="inline-flex items-center gap-1 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold text-danger">
                            <ShieldAlert className="h-3 w-3" /> TAMPERED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-success/15 px-1.5 py-0.5 text-[10px] font-bold text-success">
                            <ShieldCheck className="h-3 w-3" /> OK
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <p className="mt-2 text-[10px] text-muted-foreground">
          Hash algoritmo: djb2 (client-side). Em produção com Lovable Cloud, a mesma cadeia é
          re-hashada com SHA-256 dentro do trigger PostgreSQL — CSV exportado é verificável
          externamente contra o snapshot do banco.
        </p>
      </main>
      <Toaster />
    </div>
  );
}
