import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, Bell, CheckCircle2, Copy, Gauge, KeyRound, Plug, PlayCircle, Power, Save, ShieldAlert, Sliders, Trash2, Send, Zap } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { signPayload } from "@/lib/medical/webhook-signature";
import {
  applyMapping,
  SAMPLE_ERP_PAYLOAD,
  SAMPLE_MAPPING,
  type ErpMappingConfig,
} from "@/lib/medical/erp-mapping";
import { ERP_CONNECTORS, type ErpConnector } from "@/lib/medical/erp-connectors";
import { PortalMonitorCard } from "@/components/medical/portal-monitor-card";
import { BrowserAgentCard } from "@/components/medical/browser-agent-card";
import { useErpMappings } from "@/hooks/use-erp-mappings";
import { useQuotes } from "@/hooks/use-quotes";
import { OWNERS } from "@/lib/medical/mock-data";
import { quarantine } from "@/lib/medical/quarantine";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { DEFAULT_TENANT_CONFIG } from "@/lib/medical/tenant-config";
import { useOutboundWebhooks } from "@/hooks/use-outbound-webhooks";
import {
  addSubscription,
  removeSubscription,
  toggleSubscription,
  type OutboundChannel,
} from "@/lib/medical/outbound-webhooks";
import { getCachedSuggestion, getPriceCacheStats, resetPriceCache } from "@/lib/medical/price-cache";
import { INITIAL_QUOTES } from "@/lib/medical/mock-data";
import { cn } from "@/lib/utils";



export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Portal de Integrações — USE Medical" },
      {
        name: "description",
        content:
          "Sandbox self-service para mapear campos do seu ERP, salvar configurações e ingerir cotações reais.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const navigate = useNavigate();
  const { mappings, saveMapping, deleteMapping } = useErpMappings();
  const { addQuote } = useQuotes();
  const { tenant, scope } = useActiveTenant();
  const [payload, setPayload] = useState(() => JSON.stringify(SAMPLE_ERP_PAYLOAD, null, 2));
  const [mapping, setMapping] = useState(() => JSON.stringify(SAMPLE_MAPPING, null, 2));
  const [name, setName] = useState("");
  const [result, setResult] = useState<null | ReturnType<typeof applyMapping>>(null);

  function sendToQuarantine() {
    let parsedPayload: unknown = payload;
    try { parsedPayload = JSON.parse(payload); } catch { /* mantém string crua */ }
    const errors = result?.errors ?? [payloadErr, mappingErr].filter(Boolean) as string[];
    quarantine({
      tenant_id: scope === "all" ? null : scope,
      source: "sandbox",
      reason: result && !result.ok ? "Falha no mapeamento" : "JSON inválido",
      errors,
      payload_raw: parsedPayload,
    });
    toast.success("Payload enviado para a Quarentena.");
  }


  const [payloadErr, mappingErr] = useMemo(() => {
    let pe: string | null = null;
    let me: string | null = null;
    try { JSON.parse(payload); } catch (e) { pe = (e as Error).message; }
    try { JSON.parse(mapping); } catch (e) { me = (e as Error).message; }
    return [pe, me];
  }, [payload, mapping]);

  function run() {
    if (payloadErr || mappingErr) return toast.error("Corrija o JSON antes de testar.");
    const p = JSON.parse(payload);
    const m: ErpMappingConfig = JSON.parse(mapping);
    const r = applyMapping(p, m);
    setResult(r);
    if (r.ok) toast.success("Payload mapeado com sucesso.");
    else toast.error(`${r.errors.length} erro(s) de mapeamento.`);
  }

  function save() {
    if (mappingErr) return toast.error("JSON de mapeamento inválido.");
    if (!name.trim()) return toast.error("Dê um nome ao mapeamento.");
    saveMapping(name, JSON.parse(mapping) as ErpMappingConfig);
    toast.success(`Mapeamento "${name}" salvo.`);
    setName("");
  }

  function ingest() {
    if (!result?.ok || !result.draft) return toast.error("Rode o teste antes de ingerir.");
    const d = result.draft;
    const q = addQuote({
      owner_id: OWNERS[0].id,
      customer_name: d.customer_name,
      customer_segment: d.customer_segment,
      source_type: "edi",
      original_payload: d.original_payload,
      items: d.items.map((it) => ({
        product_id: it.sku,
        sku: it.sku,
        name: it.name,
        quantity: it.quantity,
        unit_price: it.unit_price,
        cost_price: it.cost_price,
      })),
    });
    toast.success(`Cotação ${q.id} criada a partir do ERP.`);
    navigate({ to: "/", search: { open: q.id } });
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Cotações ingeridas entram no tenant ativo" />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Portal de integrações</h1>
            <p className="text-xs text-muted-foreground">
              Mapeie campos do seu ERP, salve o preset e ingira cotações no pipeline.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={run} className="gap-1.5">
              <PlayCircle className="h-4 w-4" /> Testar
            </Button>
            <Button size="sm" onClick={ingest} disabled={!result?.ok} className="gap-1.5">
              <Send className="h-4 w-4" /> Ingerir como cotação
            </Button>
          </div>
        </div>

        <ConnectorsGrid
          onApplyPreset={(c) => {
            if (c.mappingTemplate) {
              setMapping(JSON.stringify(c.mappingTemplate, null, 2));
              setName(`${c.name} — preset`);
              toast.success(`Template do ${c.name} carregado no editor abaixo.`);
            } else {
              toast.info(`${c.name} ainda não tem template. Configure manualmente.`);
            }
          }}
        />


        {mappings.length > 0 && (
          <div className="rounded-lg border bg-card p-3 card-shadow">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Mapeamentos salvos
            </h3>
            <div className="flex flex-wrap gap-2">
              {mappings.map((m) => (
                <div key={m.id} className="inline-flex items-center gap-1 rounded border bg-background px-2 py-1 text-xs">
                  <button
                    onClick={() => { setMapping(JSON.stringify(m.config, null, 2)); toast.info(`Carregado: ${m.name}`); }}
                    className="font-medium text-foreground hover:text-primary"
                  >
                    {m.name}
                  </button>
                  <button onClick={() => deleteMapping(m.id)} aria-label="Excluir" className="text-muted-foreground hover:text-destructive">
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          <Editor title="Payload do ERP (exemplo)" value={payload} onChange={setPayload} error={payloadErr} />
          <Editor title="Configuração de mapeamento (JSONPath)" value={mapping} onChange={setMapping} error={mappingErr} />
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3 card-shadow">
          <Input
            placeholder="Nome do preset (ex.: TASY Hospital X)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="h-8 max-w-xs text-xs"
          />
          <Button size="sm" variant="outline" onClick={save} className="gap-1.5">
            <Save className="h-4 w-4" /> Salvar mapeamento
          </Button>
        </div>

        {result && (
          <div className={cn(
            "rounded-lg border p-3 card-shadow",
            result.ok ? "border-success/40 bg-success/5" : "border-destructive/40 bg-destructive/5",
          )}>
            <div className="flex items-center gap-2 text-sm font-semibold">
              {result.ok ? (
                <><CheckCircle2 className="h-4 w-4 text-success" /> Mapeamento válido</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-destructive" /> Corrija os erros abaixo</>
              )}
            </div>
            {!result.ok && (
              <>
                <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                  {result.errors.map((e, i) => <li key={i}>{e}</li>)}
                </ul>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={sendToQuarantine}>
                    <ShieldAlert className="h-3.5 w-3.5" /> Enviar para Quarentena
                  </Button>
                  <Link to="/quarentena" className="text-xs font-medium text-primary underline-offset-2 hover:underline">
                    Ver fila de quarentena
                  </Link>
                </div>
              </>
            )}
            {result.ok && result.draft && (
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-card p-2 text-[11px] leading-snug">
{JSON.stringify(result.draft, null, 2)}
              </pre>
            )}
          </div>
        )}

        <TenantConfigCard tenantId={tenant?.id ?? null} tenantName={tenant?.name ?? null} />

        <PortalMonitorCard />

        <BrowserAgentCard />

        <div className="grid gap-3 lg:grid-cols-2">
          <OutboundWebhooksCard />
          <PriceCacheCard />
        </div>

        <SignatureHelper payload={payload} mapping={mapping} disabled={!!payloadErr || !!mappingErr} />

        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground card-shadow">
          <strong className="text-foreground">Endpoint público:</strong>{" "}
          <code>POST /api/public/erp/ingest</code> — body{" "}
          <code>{`{ tenant_token, mapping, payload }`}</code>. Header{" "}
          <code>x-use-signature: sha256=&lt;HMAC&gt;</code> (use o helper acima).
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function TenantConfigCard({ tenantId, tenantName }: { tenantId: string | null; tenantName: string | null }) {
  const { config, update, reset } = useTenantConfig(tenantId);
  const [minPct, setMinPct] = useState(() => (config.min_margin * 100).toFixed(1));
  const [tgtPct, setTgtPct] = useState(() => (config.target_margin * 100).toFixed(1));

  if (!tenantId) {
    return (
      <div className="rounded-lg border border-dashed bg-card p-3 text-xs text-muted-foreground card-shadow">
        <div className="flex items-center gap-2 font-semibold text-foreground">
          <Sliders className="h-4 w-4 text-brand" /> Config por tenant
        </div>
        <p className="mt-1">Selecione um tenant no switcher do header para editar o piso de margem e o alvo da IA.</p>
      </div>
    );
  }

  function save() {
    const mn = Number(minPct) / 100;
    const tg = Number(tgtPct) / 100;
    if (!Number.isFinite(mn) || mn < 0 || mn > 0.9) return toast.error("Margem mínima inválida (0–90%).");
    if (!Number.isFinite(tg) || tg < mn) return toast.error("Alvo deve ser ≥ ao piso.");
    update({ min_margin: mn, target_margin: tg });
    toast.success("Config atualizada.");
  }

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Sliders className="h-4 w-4 text-brand" /> Margem — {tenantName}
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          padrão {(DEFAULT_TENANT_CONFIG.min_margin * 100).toFixed(0)}% / {(DEFAULT_TENANT_CONFIG.target_margin * 100).toFixed(0)}%
        </span>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-muted-foreground">Piso duro (bloqueia envio) %</span>
          <Input value={minPct} onChange={(e) => setMinPct(e.target.value)} inputMode="decimal" className="h-8 text-xs" />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-medium text-muted-foreground">Alvo da IA %</span>
          <Input value={tgtPct} onChange={(e) => setTgtPct(e.target.value)} inputMode="decimal" className="h-8 text-xs" />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={save}>
          <Save className="h-3.5 w-3.5" /> Salvar
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="gap-1.5"
          onClick={() => { reset(); setMinPct((DEFAULT_TENANT_CONFIG.min_margin * 100).toFixed(1)); setTgtPct((DEFAULT_TENANT_CONFIG.target_margin * 100).toFixed(1)); toast.success("Restaurado ao padrão."); }}
        >
          Restaurar padrão
        </Button>
      </div>
    </div>
  );
}


function Editor({
  title, value, onChange, error,
}: { title: string; value: string; onChange: (v: string) => void; error: string | null }) {
  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
        {error ? (
          <span className="text-[10px] font-semibold text-destructive">JSON inválido</span>
        ) : (
          <span className="text-[10px] font-semibold text-success">JSON válido</span>
        )}
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        className={cn(
          "h-72 w-full resize-y rounded border bg-background p-2 font-mono text-[11px] leading-snug outline-none focus:ring-2 focus:ring-primary/40",
          error && "border-destructive/60",
        )}
      />
      {error && <p className="mt-1 text-[10px] text-destructive">{error}</p>}
    </div>
  );
}

function SignatureHelper({ payload, mapping, disabled }: { payload: string; mapping: string; disabled: boolean }) {
  const [secret, setSecret] = useState("");
  const [token, setToken] = useState("tenant-demo-token");
  const [sig, setSig] = useState<string | null>(null);
  const [body, setBody] = useState<string | null>(null);
  const [liveResp, setLiveResp] = useState<{ status: number; body: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function buildBody(): Promise<string | null> {
    if (disabled) { toast.error("Corrija o JSON antes."); return null; }
    try {
      return JSON.stringify({
        tenant_token: token,
        mapping: JSON.parse(mapping),
        payload: JSON.parse(payload),
      });
    } catch (e) {
      toast.error((e as Error).message);
      return null;
    }
  }

  async function generate() {
    if (!secret.trim()) return toast.error("Informe o ERP_INGEST_SECRET.");
    const b = await buildBody();
    if (!b) return;
    const s = await signPayload(secret, b);
    setBody(b);
    setSig(s);
    toast.success("Assinatura gerada.");
  }

  async function callLive() {
    const b = body ?? (await buildBody());
    if (!b) return;
    setBusy(true);
    try {
      const headers: Record<string, string> = { "content-type": "application/json" };
      if (sig) headers["x-use-signature"] = sig;
      const r = await fetch("/api/public/erp/ingest", { method: "POST", headers, body: b });
      const text = await r.text();
      setLiveResp({ status: r.status, body: text });
      if (r.ok) toast.success(`Endpoint respondeu ${r.status}.`);
      else toast.error(`Endpoint retornou ${r.status}.`);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function copyCurl() {
    if (!sig || !body) return;
    const cmd = `curl -X POST "$BASE_URL/api/public/erp/ingest" \\\n  -H "content-type: application/json" \\\n  -H "x-use-signature: ${sig}" \\\n  -d '${body.replace(/'/g, "'\\''")}'`;
    await navigator.clipboard.writeText(cmd);
    toast.success("cURL copiado.");
  }

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <KeyRound className="h-4 w-4 text-brand" /> Gerador de assinatura HMAC + teste ao vivo
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <Input placeholder="ERP_INGEST_SECRET (opcional em dev)" value={secret} onChange={(e) => setSecret(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="tenant_token" value={token} onChange={(e) => setToken(e.target.value)} className="h-8 text-xs" />
        <Button size="sm" onClick={generate} className="gap-1.5"><KeyRound className="h-4 w-4" /> Assinar</Button>
        <Button size="sm" variant="outline" onClick={callLive} disabled={busy} className="gap-1.5">
          <PlayCircle className="h-4 w-4" /> {busy ? "Enviando..." : "Chamar endpoint"}
        </Button>
      </div>
      {sig && (
        <div className="mt-2 space-y-1">
          <code className="block break-all rounded bg-background p-2 text-[11px]">{sig}</code>
          <Button size="sm" variant="outline" onClick={copyCurl} className="gap-1.5">
            <Copy className="h-3 w-3" /> Copiar cURL
          </Button>
        </div>
      )}
      {liveResp && (
        <div className="mt-2">
          <div className={cn(
            "mb-1 inline-block rounded px-2 py-0.5 text-[10px] font-bold",
            liveResp.status < 300 ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive",
          )}>
            HTTP {liveResp.status}
          </div>
          <pre className="max-h-56 overflow-auto rounded bg-background p-2 text-[11px] leading-snug">{liveResp.body}</pre>
        </div>
      )}
    </div>
  );
}

function ConnectorsGrid({ onApplyPreset }: { onApplyPreset: (c: ErpConnector) => void }) {
  const [selected, setSelected] = useState<ErpConnector | null>(null);
  const statusStyle: Record<ErpConnector["status"], string> = {
    estavel: "bg-success/15 text-success",
    beta: "bg-brand/15 text-brand",
    planejado: "bg-muted text-muted-foreground",
  };
  const statusLabel: Record<ErpConnector["status"], string> = {
    estavel: "Estável",
    beta: "Beta",
    planejado: "Planejado",
  };
  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
        <Plug className="h-4 w-4 text-brand" /> Conectores de ERP
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Escolha o ERP do cliente para pré-preencher o wizard de credenciais e mapeamento.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {ERP_CONNECTORS.map((c) => {
          const active = selected?.id === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelected(active ? null : c)}
              className={cn(
                "group flex flex-col items-start gap-1 rounded-md border bg-background p-3 text-left transition-smooth press",
                active ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/40 hover:bg-accent/40",
              )}
            >
              <div className="flex w-full items-center justify-between gap-2">
                <span className="text-sm font-semibold text-foreground">{c.name}</span>
                <span className={cn("rounded px-1.5 py-0.5 text-[10px] font-bold uppercase", statusStyle[c.status])}>
                  {statusLabel[c.status]}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">{c.vendor} · Auth: {c.authType}</span>
              <p className="text-[11px] leading-snug text-muted-foreground line-clamp-3">{c.description}</p>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="mt-3 rounded-md border border-primary/30 bg-primary/5 p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm font-bold text-foreground">Configurar {selected.name}</div>
              <div className="text-[11px] text-muted-foreground">
                {selected.status === "planejado"
                  ? "Registre interesse — priorizamos conforme demanda."
                  : "Preencha as credenciais. Nada é enviado agora — apenas gera o preset."}
              </div>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setSelected(null)} className="h-6 px-2 text-[11px]">
              <Trash2 className="h-3 w-3" /> Fechar
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {selected.authFields.map((f) => (
              <div key={f.key}>
                <label className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </label>
                <Input
                  type={f.secret ? "password" : "text"}
                  placeholder={f.placeholder ?? f.label}
                  className="h-8 text-xs"
                  disabled={selected.status === "planejado"}
                />
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Button
              size="sm"
              disabled={selected.status === "planejado"}
              onClick={() => onApplyPreset(selected)}
              className="gap-1.5"
            >
              <Save className="h-3 w-3" /> Salvar preset
            </Button>
            {selected.defaultEndpoint && (
              <code className="rounded bg-background px-2 py-1 text-[11px]">POST {selected.defaultEndpoint}</code>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


function OutboundWebhooksCard() {
  const { subs, logs, test } = useOutboundWebhooks();
  const [channel, setChannel] = useState<OutboundChannel>("slack");
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");

  function add() {
    if (!url.trim() || !/^https?:\/\//.test(url)) return toast.error("Informe uma URL http(s) válida.");
    if (!label.trim()) return toast.error("Dê um rótulo (ex.: #vendas-critico).");
    addSubscription({ channel, url, label });
    setUrl(""); setLabel("");
    toast.success("Webhook cadastrado. Disparos automáticos a cada 30s.");
  }

  async function runTest() {
    const n = await test();
    if (n === 0) toast.info("Sem inscrições ativas ou sem cotações para disparar.");
    else toast.success(`${n} push disparado(s).`);
  }

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Bell className="h-4 w-4 text-brand" /> SLA push externo
        </div>
        <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={runTest}>
          <Zap className="h-3.5 w-3.5" /> Testar disparo
        </Button>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
        Envia mensagem para Slack/Teams/WhatsApp quando uma cotação Tier A ficar atrasada.
        Dedupe por cotação; polling a cada 30s enquanto a aba estiver aberta.
      </p>

      <div className="grid gap-2 sm:grid-cols-[100px_1fr_1fr_auto]">
        <select
          value={channel}
          onChange={(e) => setChannel(e.target.value as OutboundChannel)}
          className="h-8 rounded border bg-background px-2 text-xs"
        >
          <option value="slack">Slack</option>
          <option value="teams">Teams</option>
          <option value="whatsapp">WhatsApp</option>
          <option value="webhook">Webhook</option>
        </select>
        <Input placeholder="URL do webhook" value={url} onChange={(e) => setUrl(e.target.value)} className="h-8 text-xs" />
        <Input placeholder="Rótulo (ex: #vendas-critico)" value={label} onChange={(e) => setLabel(e.target.value)} className="h-8 text-xs" />
        <Button size="sm" onClick={add} className="gap-1.5"><Save className="h-3.5 w-3.5" /> Adicionar</Button>
      </div>

      {subs.length > 0 && (
        <ul className="mt-3 space-y-1">
          {subs.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2 rounded border bg-background px-2 py-1 text-xs">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{s.channel}</span>
                  <span className="truncate font-medium text-foreground">{s.label}</span>
                </div>
                <div className="truncate text-[10px] text-muted-foreground">{s.url}</div>
              </div>
              <button
                onClick={() => toggleSubscription(s.id, !s.enabled)}
                className={cn(
                  "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold",
                  s.enabled ? "bg-success/15 text-success" : "bg-muted text-muted-foreground",
                )}
                aria-label={s.enabled ? "Desativar" : "Ativar"}
              >
                <Power className="h-3 w-3" /> {s.enabled ? "ON" : "OFF"}
              </button>
              <button onClick={() => removeSubscription(s.id)} className="text-muted-foreground hover:text-destructive" aria-label="Remover">
                <Trash2 className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {logs.length > 0 && (
        <div className="mt-3">
          <div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">Últimos disparos</div>
          <ul className="max-h-32 space-y-0.5 overflow-auto text-[10px] text-muted-foreground">
            {logs.slice(0, 6).map((l) => (
              <li key={l.id} className="flex items-center gap-2">
                <span className={cn("h-1.5 w-1.5 rounded-full", l.status === "success" ? "bg-success" : "bg-destructive")} />
                <span className="tabular-nums">{new Date(l.at).toLocaleTimeString("pt-BR")}</span>
                <span className="truncate">quote {l.quote_id} · {l.info}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function PriceCacheCard() {
  const [stats, setStats] = useState(() => getPriceCacheStats());
  const [busy, setBusy] = useState(false);

  function refresh() { setStats(getPriceCacheStats()); }

  async function warm() {
    setBusy(true);
    try {
      // Roda 2x: 1º passa popula, 2º demonstra hits.
      for (let pass = 0; pass < 2; pass++) {
        for (const q of INITIAL_QUOTES) {
          for (const it of q.items) {
            await getCachedSuggestion(q.tenant_id, it, 0.28);
          }
        }
      }
      refresh();
      toast.success("Cache aquecido. Veja a taxa de acerto.");
    } finally {
      setBusy(false);
    }
  }

  const hitPct = (stats.hitRate * 100).toFixed(1);
  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Gauge className="h-4 w-4 text-brand" /> Cache de precificação
        </div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 gap-1.5" onClick={warm} disabled={busy}>
            <Zap className="h-3.5 w-3.5" /> {busy ? "Aquecendo..." : "Aquecer"}
          </Button>
          <Button size="sm" variant="ghost" className="h-7 gap-1.5" onClick={() => { resetPriceCache(); refresh(); }}>
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </Button>
        </div>
      </div>
      <p className="mb-3 text-[11px] leading-snug text-muted-foreground">
        Proxy em memória para sugestões de preço. SLO: hits &lt; 5ms; misses simulam &lt;100ms para
        aproximar o comportamento do Redis planejado.
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Hit rate" value={`${hitPct}%`} tone={stats.hitRate >= 0.7 ? "success" : stats.hitRate >= 0.4 ? "brand" : "muted"} />
        <Stat label="Hits" value={String(stats.hits)} />
        <Stat label="Misses" value={String(stats.misses)} />
        <Stat label="Miss médio" value={`${stats.avgMissMs.toFixed(0)}ms`} tone={stats.avgMissMs < 100 ? "success" : "destructive"} />
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Entradas em cache: <strong className="text-foreground">{stats.size}</strong></span>
        <span>Evicções: {stats.evictions}</span>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "muted" }: { label: string; value: string; tone?: "success" | "destructive" | "brand" | "muted" }) {
  const styles: Record<string, string> = {
    success: "text-success",
    destructive: "text-destructive",
    brand: "text-brand",
    muted: "text-foreground",
  };
  return (
    <div className="rounded border bg-background p-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className={cn("text-sm font-bold tabular-nums", styles[tone])}>{value}</div>
    </div>
  );
}
