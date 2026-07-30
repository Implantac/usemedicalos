import { createFileRoute, Link } from "@tanstack/react-router";
import { PermissionGate } from "@/components/medical/permission-gate";
import { useEffect, useMemo, useState } from "react";
import { ShieldCheck, Clock, XCircle } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { listAllActiveOverrides, revokeOverride, type ComplianceOverride } from "@/lib/medical/compliance-override";
import { appendActivity } from "@/lib/medical/activity";

export const Route = createFileRoute("/excecoes")({
  head: () => ({
    meta: [
      { title: "Exceções de Compliance — USE Medical" },
      { name: "description", content: "Auditoria de liberações de gestor sobre bloqueios ANVISA/CMED." },
    ],
  }),
  component: () => (
    <PermissionGate perm="compliance.override" title="Exceções restrito">
      <ExceptionsPage />
    </PermissionGate>
  ),
});

function ExceptionsPage() {
  const { quotes, resetDemo } = useQuotes();
  const [tick, setTick] = useState(0);

  const quoteById = useMemo(() => new Map(quotes.map((q) => [q.id, q])), [quotes]);
  const overrides = useMemo(
    // `quotes` já vem filtrado pelo tenant ativo (useQuotes). Só listamos
    // overrides cujo quote_id está dentro do escopo — evita vazar exceções
    // de outros tenants na visão single-tenant.
    () => listAllActiveOverrides().filter((o) => quoteById.has(o.quote_id)),
    [tick, quoteById],
  );

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  function handleRevoke(o: ComplianceOverride) {
    revokeOverride(o.quote_id, o.sku);
    appendActivity({
      quote_id: o.quote_id,
      type: "compliance_override_revoked",
      message: `Exceção revogada para SKU ${o.sku} (gestor ${o.manager_id})`,
      meta: { sku: o.sku, reason: "Revogado via auditoria" },
    });
    toast.success("Exceção revogada.");
    setTick((t) => t + 1);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-4 sm:py-6">
        <TenantScopeBanner hint="Exceções ANVISA/CMED" />
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand" />
          <h1 className="text-lg font-bold tracking-tight">Exceções ativas de compliance</h1>
          <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {overrides.length} ativa(s)
          </span>
        </div>

        {overrides.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            Nenhuma liberação ativa. Todos os bloqueios ANVISA/CMED estão em vigor.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Cotação</th>
                  <th className="px-3 py-2">SKU</th>
                  <th className="px-3 py-2">Gestor</th>
                  <th className="px-3 py-2">Justificativa</th>
                  <th className="px-3 py-2">Expira</th>
                  <th className="px-3 py-2 text-right">Ação</th>
                </tr>
              </thead>
              <tbody>
                {overrides.map((o) => {
                  const q = quoteById.get(o.quote_id);
                  const expiresIn = Math.max(0, new Date(o.expires_at).getTime() - Date.now());
                  const hours = Math.floor(expiresIn / 3_600_000);
                  const mins = Math.floor((expiresIn % 3_600_000) / 60_000);
                  return (
                    <tr key={`${o.quote_id}-${o.sku}`} className="border-b border-border last:border-b-0 hover:bg-muted/30">
                      <td className="px-3 py-2">
                        {q ? (
                          <Link to="/inbox" search={{ open: q.id }} className="font-semibold text-primary hover:underline">
                            {q.customer_name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">#{o.quote_id.slice(0, 8)}</span>
                        )}
                      </td>
                      <td className="px-3 py-2 font-mono text-xs">{o.sku}</td>
                      <td className="px-3 py-2 text-xs">{o.manager_id}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{o.reason}</td>
                      <td className="px-3 py-2 text-xs">
                        <span className="inline-flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-3 w-3" /> {hours}h {mins}m
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Button size="sm" variant="ghost" className="h-7 gap-1 text-danger hover:bg-danger/10 hover:text-danger" onClick={() => handleRevoke(o)}>
                          <XCircle className="h-3.5 w-3.5" /> Revogar
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Toaster richColors position="top-right" />
    </div>
  );
}
