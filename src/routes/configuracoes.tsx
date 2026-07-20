import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { RotateCcw, Save, Settings2 } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { PermissionGate } from "@/components/medical/permission-gate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { DEFAULT_TENANT_CONFIG } from "@/lib/medical/tenant-config";
import { toast } from "sonner";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações do Tenant · USE Medical" },
      { name: "description", content: "Ajuste margem mínima, margem alvo e retenção de dados por tenant." },
    ],
  }),
  component: () => (
    <PermissionGate perm="tenant.configure" title="Configurações restritas">
      <Page />
    </PermissionGate>
  ),
});

function Page() {
  const { tenant } = useActiveTenant();
  const { config, hydrated, update, reset } = useTenantConfig(tenant?.id);

  const [minMargin, setMinMargin] = useState(config.min_margin * 100);
  const [targetMargin, setTargetMargin] = useState(config.target_margin * 100);
  const [retentionDays, setRetentionDays] = useState(config.retention_days);

  useEffect(() => {
    if (!hydrated) return;
    setMinMargin(Number((config.min_margin * 100).toFixed(2)));
    setTargetMargin(Number((config.target_margin * 100).toFixed(2)));
    setRetentionDays(config.retention_days);
  }, [hydrated, config.min_margin, config.target_margin, config.retention_days]);

  const dirty =
    Math.abs(minMargin / 100 - config.min_margin) > 1e-6 ||
    Math.abs(targetMargin / 100 - config.target_margin) > 1e-6 ||
    retentionDays !== config.retention_days;

  const invalid =
    minMargin < 0 ||
    minMargin > 100 ||
    targetMargin < 0 ||
    targetMargin > 100 ||
    targetMargin < minMargin ||
    retentionDays < 7 ||
    retentionDays > 3650;

  const save = () => {
    if (!tenant) return;
    if (invalid) {
      toast.error("Valores inválidos", {
        description: "Margem alvo deve ser ≥ margem mínima. Retenção 7–3650 dias.",
      });
      return;
    }
    update({
      min_margin: minMargin / 100,
      target_margin: targetMargin / 100,
      retention_days: retentionDays,
    });
    toast.success("Configurações salvas", {
      description: `${tenant.name} atualizado.`,
    });
  };

  const doReset = () => {
    if (!tenant) return;
    reset();
    toast.info("Restaurado para os padrões");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => window.location.reload()} />
      <main className="mx-auto max-w-2xl px-4 py-6">
        <header className="mb-5 flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Settings2 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground">
              Configurações do tenant
            </h1>
            <p className="text-xs text-muted-foreground">
              {tenant ? tenant.name : "Selecione um tenant específico na topbar."} · Overrides
              locais até o Cloud entrar no ar (tabela <code>tenant_config</code>).
            </p>
          </div>
        </header>

        {!tenant ? (
          <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground card-shadow">
            Você está no escopo <strong>Todos os tenants</strong>. Troque para um tenant específico
            para editar as regras.
          </div>
        ) : (
          <div className="space-y-5 rounded-lg border bg-card p-5 card-shadow">
            <Field
              label="Margem mínima (piso duro)"
              hint="Cotações abaixo deste piso são bloqueadas no envio."
              suffix="%"
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={100}
                value={minMargin}
                onChange={(e) => setMinMargin(Number(e.target.value))}
              />
            </Field>

            <Field
              label="Margem alvo (IA de sugestão)"
              hint="Preço sugerido pelo motor mira este ponto quando o mercado permite."
              suffix="%"
            >
              <Input
                type="number"
                inputMode="decimal"
                step="0.5"
                min={0}
                max={100}
                value={targetMargin}
                onChange={(e) => setTargetMargin(Number(e.target.value))}
              />
            </Field>

            <Field
              label="Retenção de dados (Data Residency)"
              hint="Cotações perdidas são purgadas após N dias."
              suffix="dias"
            >
              <Input
                type="number"
                inputMode="numeric"
                step="1"
                min={7}
                max={3650}
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
              />
            </Field>

            {invalid && (
              <p className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-[11px] text-destructive">
                Valores inválidos. Margem alvo deve ser ≥ margem mínima e retenção entre 7 e 3650
                dias.
              </p>
            )}

            <div className="flex items-center justify-between gap-2 border-t pt-4">
              <div className="text-[11px] text-muted-foreground">
                Padrão: {(DEFAULT_TENANT_CONFIG.min_margin * 100).toFixed(0)}% /{" "}
                {(DEFAULT_TENANT_CONFIG.target_margin * 100).toFixed(0)}% /{" "}
                {DEFAULT_TENANT_CONFIG.retention_days}d
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" onClick={doReset}>
                  <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                  Restaurar
                </Button>
                <Button size="sm" onClick={save} disabled={!dirty || invalid}>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Salvar
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  suffix,
  children,
}: {
  label: string;
  hint: string;
  suffix: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <div className="mt-1 flex items-center gap-2">
        <div className="flex-1">{children}</div>
        <span className="w-12 text-[11px] text-muted-foreground">{suffix}</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>
    </div>
  );
}
