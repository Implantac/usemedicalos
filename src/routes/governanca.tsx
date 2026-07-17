import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Shield, ShieldCheck, Users, RotateCcw, Info } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useGovernance } from "@/hooks/use-governance";
import { OWNERS, TENANTS } from "@/lib/medical/mock-data";
import {
  PERMISSIONS,
  ROLE_DEFAULT_PERMISSIONS,
  ROLE_DESCRIPTION,
  ROLE_LABEL,
  resolvePermissions,
  type GovRole,
  type Permission,
} from "@/lib/medical/governance";
import { resetDemo } from "@/lib/medical/mock-data";

export const Route = createFileRoute("/governanca")({
  head: () => ({
    meta: [
      { title: "Governança — USE Medical" },
      {
        name: "description",
        content:
          "Painel de papéis e permissões por tenant. Controle quem opera, aprova e configura o Commercial OS.",
      },
    ],
  }),
  component: GovernancePage,
});

const ROLES: GovRole[] = ["viewer", "vendedor", "gestor", "admin"];

function GovernancePage() {
  const { tenant, scope, setActiveTenant, tenants } = useActiveTenant();
  const activeTenantId = tenant?.id ?? TENANTS[0].id;
  const { memberships, setRole, toggleOverride, reset } = useGovernance(activeTenantId);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const rows = useMemo(() => {
    return OWNERS.map((o) => {
      const m = memberships.find((x) => x.user_id === o.id);
      return {
        owner: o,
        membership: m,
        role: m?.role,
        perms: resolvePermissions(m),
      };
    });
  }, [memberships]);

  const selected = rows.find((r) => r.owner.id === selectedUserId) ?? rows[0];
  const groups = useMemo(() => {
    const g = new Map<string, typeof PERMISSIONS>();
    PERMISSIONS.forEach((p) => {
      const arr = g.get(p.group) ?? [];
      arr.push(p);
      g.set(p.group, arr);
    });
    return Array.from(g.entries());
  }, []);

  return (
    <div className="min-h-svh bg-background">
      <AppHeader onReset={resetDemo} />
      <TenantScopeBanner />
      <Toaster />

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4 sm:py-6">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
                Governança de acesso
              </h1>
            </div>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Papéis e permissões por tenant. Overrides são auditados — o padrão do papel
              é o piso; grants/revokes ficam registrados no membership.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {scope === "all" ? (
              <Select
                value={activeTenantId}
                onValueChange={(v) => setActiveTenant(v)}
              >
                <SelectTrigger className="h-9 w-56 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tenants.map((t) => (
                    <SelectItem key={t.id} value={t.id} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                reset();
                toast.success("Governança restaurada ao seed padrão.");
              }}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              Reset
            </Button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          {/* Membros do tenant */}
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Users className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold">Membros — {tenant?.name}</h2>
              <Badge variant="secondary" className="ml-auto text-[10px]">
                {rows.filter((r) => r.membership).length} ativos
              </Badge>
            </header>
            <div className="divide-y divide-border">
              {rows.map((row) => (
                <button
                  key={row.owner.id}
                  onClick={() => setSelectedUserId(row.owner.id)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-muted/50",
                    (selected?.owner.id === row.owner.id) && "bg-muted",
                  )}
                >
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                    {row.owner.initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{row.owner.name}</div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {row.owner.territory}
                    </div>
                  </div>
                  <Select
                    value={row.role ?? "viewer"}
                    onValueChange={(v) => {
                      setRole(row.owner.id, v as GovRole);
                      toast.success(`${row.owner.name} agora é ${ROLE_LABEL[v as GovRole]}.`);
                    }}
                  >
                    <SelectTrigger
                      className="h-8 w-28 text-xs"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLES.map((r) => (
                        <SelectItem key={r} value={r} className="text-xs">
                          {ROLE_LABEL[r]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Badge
                    variant="outline"
                    className="hidden shrink-0 text-[10px] sm:inline-flex"
                  >
                    {row.perms.length} perms
                  </Badge>
                </button>
              ))}
            </div>
          </section>

          {/* Painel de permissões */}
          <section className="rounded-lg border border-border bg-card shadow-sm">
            <header className="flex items-center gap-2 border-b border-border px-4 py-3">
              <ShieldCheck className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold">
                Permissões — {selected?.owner.name ?? "—"}
              </h2>
              {selected?.role ? (
                <Badge className="ml-auto bg-primary/10 text-[10px] text-primary hover:bg-primary/10">
                  {ROLE_LABEL[selected.role]}
                </Badge>
              ) : null}
            </header>

            {selected?.role ? (
              <p className="border-b border-border bg-muted/30 px-4 py-2 text-[11px] text-muted-foreground">
                {ROLE_DESCRIPTION[selected.role]}
              </p>
            ) : null}

            <TooltipProvider delayDuration={150}>
              <div className="space-y-4 p-4">
                {groups.map(([group, perms]) => (
                  <div key={group}>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group}
                    </div>
                    <div className="space-y-1">
                      {perms.map((p) => {
                        const roleDefaults = selected?.role
                          ? ROLE_DEFAULT_PERMISSIONS[selected.role]
                          : [];
                        const inDefault = roleDefaults.includes(p.key);
                        const active = selected?.perms.includes(p.key) ?? false;
                        const override = active !== inDefault;
                        return (
                          <label
                            key={p.key}
                            className={cn(
                              "flex cursor-pointer items-start gap-2.5 rounded-md border border-transparent px-2 py-1.5 transition hover:bg-muted/60",
                              override && "border-brand/40 bg-brand/5",
                            )}
                          >
                            <Checkbox
                              checked={active}
                              onCheckedChange={(v) => {
                                if (!selected) return;
                                toggleOverride(selected.owner.id, p.key, Boolean(v));
                              }}
                              className="mt-0.5"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-sm font-medium">{p.label}</span>
                                {override ? (
                                  <Badge className="h-4 bg-brand/20 px-1 text-[9px] font-semibold text-brand hover:bg-brand/20">
                                    OVERRIDE
                                  </Badge>
                                ) : null}
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Info className="h-3 w-3 text-muted-foreground/70" />
                                  </TooltipTrigger>
                                  <TooltipContent side="right" className="max-w-xs text-xs">
                                    {p.description}
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                              <div className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground">
                                {p.key}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </TooltipProvider>
          </section>
        </div>

        {/* Matriz consolidada */}
        <section className="mt-6 rounded-lg border border-border bg-card shadow-sm">
          <header className="flex items-center gap-2 border-b border-border px-4 py-3">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Matriz de papéis padrão</h2>
            <span className="ml-auto text-[10px] text-muted-foreground">
              Referência do que cada papel concede por padrão (antes de overrides).
            </span>
          </header>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">Permissão</th>
                  {ROLES.map((r) => (
                    <th key={r} className="px-3 py-2 text-center font-medium">
                      {ROLE_LABEL[r]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSIONS.map((p) => (
                  <tr key={p.key} className="border-t border-border">
                    <td className="px-3 py-1.5">
                      <div className="font-medium">{p.label}</div>
                      <div className="font-mono text-[10px] text-muted-foreground">{p.key}</div>
                    </td>
                    {ROLES.map((r) => {
                      const yes = ROLE_DEFAULT_PERMISSIONS[r].includes(p.key as Permission);
                      return (
                        <td key={r} className="px-3 py-1.5 text-center">
                          {yes ? (
                            <span className="inline-block h-2 w-2 rounded-full bg-success" />
                          ) : (
                            <span className="inline-block h-2 w-2 rounded-full bg-muted-foreground/20" />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
