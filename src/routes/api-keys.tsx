import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Copy, KeyRound, Lock, Plus, Trash2, XCircle } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { useApiKeys } from "@/hooks/use-api-keys";
import { TIER_LIMITS, type ApiScope, type RateTier } from "@/lib/medical/api-keys";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { TENANTS } from "@/lib/medical/mock-data";
import { usePermissions } from "@/hooks/use-permissions";
import { cn } from "@/lib/utils";


export const Route = createFileRoute("/api-keys")({
  head: () => ({
    meta: [
      { title: "API Keys — USE Medical" },
      {
        name: "description",
        content:
          "Gerencie tokens de acesso ao Ecosystem API: escopos, tiers de rate-limit e revogação por tenant.",
      },
    ],
  }),
  component: ApiKeysPage,
});

const ALL_SCOPES: { id: ApiScope; label: string; desc: string }[] = [
  { id: "catalog:read", label: "Catálogo (leitura)", desc: "GET /api/public/catalog" },
  { id: "erp:ingest", label: "Ingestão ERP", desc: "POST /api/public/erp/ingest" },
  { id: "orders:read", label: "Pedidos (leitura)", desc: "Reservado — em breve" },
];

const TIERS: RateTier[] = ["basic", "standard", "pro"];

function ApiKeysPage() {
  const { scope, tenant } = useActiveTenant();
  const tenantId = tenant?.id ?? TENANTS[0].id;
  const { keys, create, revoke, remove } = useApiKeys(tenantId);
  const { can } = usePermissions();
  const canManage = can("api_keys.manage");
  const [label, setLabel] = useState("");
  const [scopes, setScopes] = useState<ApiScope[]>(["catalog:read"]);
  const [tier, setTier] = useState<RateTier>("standard");
  const [revealed, setRevealed] = useState<string | null>(null);

  function submit() {
    if (!canManage) return toast.error("Sem permissão api_keys.manage.");
    if (!label.trim()) return toast.error("Informe um rótulo.");
    if (scopes.length === 0) return toast.error("Selecione ao menos um escopo.");
    const k = create({ label, scopes, tier });
    setRevealed(k.id);
    setLabel("");
    toast.success("Chave criada. Copie o secret agora — não será exibido novamente.");
  }


  async function copy(text: string, msg: string) {
    await navigator.clipboard.writeText(text);
    toast.success(msg);
  }

  function toggleScope(s: ApiScope) {
    setScopes((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1200px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint={scope === "all" ? "Selecione um tenant para escopar chaves" : undefined} />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">API Keys</h1>
          <p className="text-xs text-muted-foreground">
            Tokens de acesso ao Ecosystem API por tenant. Cada chave possui escopos e tier de rate-limit.
            <span className="ml-1 rounded bg-warn/15 px-1.5 py-0.5 text-[10px] font-semibold text-warn">
              Cloud pendente — validação server-side entra quando Lovable Cloud for ativado.
            </span>
          </p>
        </div>

        {!canManage && (
          <div className="flex items-start gap-2 rounded-md border border-warn/40 bg-warn/10 p-3 text-xs text-warn-foreground">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-warn" />
            <div>
              <div className="font-semibold text-foreground">Modo leitura</div>
              Você não tem a permissão <code className="font-mono">api_keys.manage</code>. Peça a um admin
              para conceder o papel adequado em <strong>Governança</strong>.
            </div>
          </div>
        )}


        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
            <Plus className="h-4 w-4 text-brand" /> Nova chave
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Input
              placeholder="Rótulo (ex.: Integração TASY produção)"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="h-8 text-xs"
            />
            <Button size="sm" onClick={submit} disabled={!canManage} className="gap-1.5">
              <KeyRound className="h-4 w-4" /> Gerar
            </Button>

          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Escopos
              </div>
              <div className="space-y-1">
                {ALL_SCOPES.map((s) => (
                  <label key={s.id} className="flex cursor-pointer items-start gap-2 rounded border bg-background p-2 text-xs">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.id)}
                      onChange={() => toggleScope(s.id)}
                      className="mt-0.5"
                    />
                    <div>
                      <div className="font-medium text-foreground">{s.label}</div>
                      <div className="text-[10px] text-muted-foreground">{s.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                Tier de rate-limit
              </div>
              <div className="space-y-1">
                {TIERS.map((t) => {
                  const lim = TIER_LIMITS[t];
                  return (
                    <label key={t} className="flex cursor-pointer items-center justify-between gap-2 rounded border bg-background p-2 text-xs">
                      <div className="flex items-center gap-2">
                        <input type="radio" name="tier" checked={tier === t} onChange={() => setTier(t)} />
                        <span className="font-medium capitalize text-foreground">{t}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground">
                        {lim.max} req / {lim.windowMs / 1000}s
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-lg border bg-card card-shadow">
          <div className="border-b p-3 text-sm font-semibold">Chaves ativas ({keys.length})</div>
          {keys.length === 0 ? (
            <div className="p-4 text-center text-xs text-muted-foreground">
              Nenhuma chave gerada ainda.
            </div>
          ) : (
            <div className="divide-y">
              {keys.map((k) => {
                const isRevealed = revealed === k.id;
                const revoked = !!k.revokedAt;
                return (
                  <div key={k.id} className={cn("p-3 text-xs", revoked && "opacity-60")}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-foreground">{k.label}</span>
                          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium capitalize">
                            {k.tier}
                          </span>
                          {revoked && (
                            <span className="rounded bg-destructive/15 px-1.5 py-0.5 text-[10px] font-bold text-destructive">
                              Revogada
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          Escopos: {k.scopes.join(", ")} · criada {new Date(k.createdAt).toLocaleString("pt-BR")}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        {!revoked && (
                          <Button size="sm" variant="outline" disabled={!canManage} onClick={() => revoke(k.id)} className="h-7 gap-1 px-2 text-[10px]">
                            <XCircle className="h-3 w-3" /> Revogar
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" disabled={!canManage} onClick={() => remove(k.id)} className="h-7 gap-1 px-2 text-[10px] text-destructive">
                          <Trash2 className="h-3 w-3" /> Excluir
                        </Button>

                      </div>
                    </div>
                    <div className="mt-2 grid gap-1 sm:grid-cols-2">
                      <TokenField label="Token público" value={k.token} onCopy={() => copy(k.token, "Token copiado.")} />
                      <TokenField
                        label="Secret HMAC"
                        value={isRevealed ? k.secret : "•".repeat(24)}
                        onCopy={() => {
                          if (!isRevealed) return toast.error("Revele primeiro.");
                          copy(k.secret, "Secret copiado.");
                        }}
                        extra={
                          !isRevealed && (
                            <Button size="sm" variant="ghost" onClick={() => setRevealed(k.id)} className="h-6 px-2 text-[10px]">
                              Revelar
                            </Button>
                          )
                        }
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="rounded-lg border bg-card p-3 text-[11px] leading-relaxed text-muted-foreground card-shadow">
          <strong className="text-foreground">Como usar:</strong> passe o token público como{" "}
          <code>tenant_token</code> no body de <code>POST /api/public/erp/ingest</code> e assine o body
          com o secret via <code>x-use-signature</code>. O sandbox em{" "}
          <code>/integracoes</code> gera a assinatura e faz o teste ao vivo.
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function TokenField({
  label,
  value,
  onCopy,
  extra,
}: {
  label: string;
  value: string;
  onCopy: () => void;
  extra?: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="flex items-center gap-1">
        <code className="min-w-0 flex-1 truncate rounded bg-background px-2 py-1 font-mono text-[11px]">
          {value}
        </code>
        <Button size="sm" variant="ghost" onClick={onCopy} className="h-7 w-7 shrink-0 p-0">
          <Copy className="h-3 w-3" />
        </Button>
        {extra}
      </div>
    </div>
  );
}
