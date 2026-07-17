import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AlertTriangle, ShieldAlert, ShieldCheck, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useQuarantine } from "@/hooks/use-quarantine";
import { removeQuarantine, setQuarantineStatus } from "@/lib/medical/quarantine";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { tenantById } from "@/lib/medical/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/quarentena")({
  head: () => ({
    meta: [
      { title: "Zona de Quarentena — USE Medical" },
      {
        name: "description",
        content:
          "Fila auditável de payloads ERP que falharam no mapeamento. Reprocesse ou descarte com histórico.",
      },
    ],
  }),
  component: QuarantinePage,
});

function QuarantinePage() {
  const { items } = useQuarantine();
  const { scope } = useActiveTenant();
  const scoped = useMemo(
    () => (scope === "all" ? items : items.filter((i) => !i.tenant_id || i.tenant_id === scope)),
    [items, scope],
  );
  const pending = scoped.filter((i) => i.status === "pending").length;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => { /* handled em outras telas */ }} />
      <main className="mx-auto max-w-[1200px] px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Fila de payloads que falharam no mapeamento — nada é perdido." />

        <header className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-xl font-bold tracking-tight text-foreground">
              <ShieldAlert className="h-5 w-5 text-brand" /> Zona de Quarentena
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              {pending} pendente{pending === 1 ? "" : "s"} de reprocessamento · {scoped.length} total
            </p>
          </div>
        </header>

        {scoped.length === 0 ? (
          <div className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground card-shadow">
            Nenhum payload em quarentena. Payloads que falharem no mapeamento aparecerão aqui.
          </div>
        ) : (
          <ul className="space-y-2">
            {scoped.map((item) => {
              const tenantName = item.tenant_id ? tenantById(item.tenant_id).name : "—";
              return (
                <li
                  key={item.id}
                  className={cn(
                    "rounded-lg border bg-card p-3 card-shadow",
                    item.status === "pending" && "border-destructive/40",
                    item.status === "reprocessed" && "border-success/40",
                    item.status === "discarded" && "opacity-60",
                  )}
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <AlertTriangle className="h-4 w-4 text-destructive" />
                        {item.reason}
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                          {item.status}
                        </span>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {new Date(item.received_at).toLocaleString("pt-BR")} · {item.source} · Tenant: {tenantName}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.status === "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 gap-1 text-xs"
                          onClick={() => {
                            setQuarantineStatus(item.id, "reprocessed");
                            toast.success("Marcado como reprocessado.");
                          }}
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Marcar reprocessado
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                        onClick={() => {
                          removeQuarantine(item.id);
                          toast.message("Item removido.");
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Descartar
                      </Button>
                    </div>
                  </div>

                  {item.errors.length > 0 && (
                    <ul className="mt-2 list-disc pl-5 text-[11px] text-destructive">
                      {item.errors.map((e, i) => (
                        <li key={i}>{e}</li>
                      ))}
                    </ul>
                  )}

                  <details className="mt-2">
                    <summary className="cursor-pointer text-[11px] font-medium text-muted-foreground hover:text-foreground">
                      Ver payload cru
                    </summary>
                    <pre className="mt-1 max-h-64 overflow-auto rounded bg-muted/40 p-2 text-[10px] leading-snug">
{typeof item.payload_raw === "string"
                        ? item.payload_raw
                        : JSON.stringify(item.payload_raw, null, 2)}
                    </pre>
                  </details>
                </li>
              );
            })}
          </ul>
        )}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
