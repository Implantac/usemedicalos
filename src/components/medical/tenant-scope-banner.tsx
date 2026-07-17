import { Building2, Globe } from "lucide-react";
import { useActiveTenant } from "@/hooks/use-active-tenant";

const ERP_LABEL: Record<string, string> = {
  use_sistemas: "Use Sistemas",
  totvs_protheus: "TOTVS Protheus",
  sankhya: "Sankhya",
  senior: "Senior",
  none: "Sem ERP",
};

/**
 * Faixa fina que reafirma o tenant ativo em rotas internas.
 * Ajuda o usuário a lembrar do escopo antes de interpretar KPIs.
 */
export function TenantScopeBanner({ hint }: { hint?: string }) {
  const { scope, tenant, hydrated } = useActiveTenant();
  if (!hydrated) return null;

  const isAll = scope === "all";
  const Icon = isAll ? Globe : Building2;
  const title = isAll ? "Visão consolidada" : tenant?.name ?? "—";
  const subtitle = isAll
    ? "Todos os tenants agregados"
    : tenant
      ? `${ERP_LABEL[tenant.erp_type]} · ${tenant.region ?? "—"} · CNPJ ${tenant.cnpj}`
      : "";

  return (
    <div
      className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-card/70 px-3 py-1.5 text-xs card-shadow"
      role="status"
      aria-label={`Escopo ativo: ${title}`}
    >
      <span
        className={
          isAll
            ? "inline-flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-primary"
            : "inline-flex h-6 w-6 items-center justify-center rounded-md bg-brand/10 text-brand"
        }
      >
        <Icon className="h-3.5 w-3.5" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate font-semibold text-foreground">{title}</div>
        {subtitle && <div className="truncate text-[11px] text-muted-foreground">{subtitle}</div>}
      </div>
      {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
    </div>
  );
}
