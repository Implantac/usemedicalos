import { Building2, Check, ChevronDown, Globe } from "lucide-react";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const ERP_LABEL: Record<string, string> = {
  use_sistemas: "Use Sistemas",
  totvs_protheus: "TOTVS Protheus",
  sankhya: "Sankhya",
  senior: "Senior",
  none: "Sem ERP",
};

export function TenantSwitcher() {
  const { scope, tenant, tenants, setActiveTenant } = useActiveTenant();
  const label = scope === "all" ? "Todos os tenants" : tenant?.name ?? "Selecionar";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 gap-1.5 px-2 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:px-2.5"
          aria-label="Trocar tenant"
        >
          {scope === "all" ? <Globe className="h-3.5 w-3.5" /> : <Building2 className="h-3.5 w-3.5" />}
          <span className="hidden max-w-[160px] truncate text-xs font-medium md:inline">{label}</span>
          <ChevronDown className="h-3 w-3 opacity-70" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-[11px] uppercase tracking-wider text-muted-foreground">
          Tenant ativo
        </DropdownMenuLabel>
        <DropdownMenuItem
          onSelect={() => setActiveTenant("all")}
          className={cn("cursor-pointer gap-2", scope === "all" && "bg-accent")}
        >
          <Globe className="h-3.5 w-3.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium">Todos os tenants</div>
            <div className="truncate text-[11px] text-muted-foreground">Visão consolidada</div>
          </div>
          {scope === "all" && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {tenants.map((t) => (
          <DropdownMenuItem
            key={t.id}
            onSelect={() => setActiveTenant(t.id)}
            className={cn("cursor-pointer gap-2", scope === t.id && "bg-accent")}
          >
            <Building2 className="h-3.5 w-3.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">{t.name}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                {ERP_LABEL[t.erp_type]} · {t.region ?? "—"}
              </div>
            </div>
            {scope === t.id && <Check className="h-3.5 w-3.5" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
