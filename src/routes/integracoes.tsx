import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Copy, KeyRound, PlayCircle, Save, Trash2, Send } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
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
import { useErpMappings } from "@/hooks/use-erp-mappings";
import { useQuotes } from "@/hooks/use-quotes";
import { OWNERS } from "@/lib/medical/mock-data";
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
  const [payload, setPayload] = useState(() => JSON.stringify(SAMPLE_ERP_PAYLOAD, null, 2));
  const [mapping, setMapping] = useState(() => JSON.stringify(SAMPLE_MAPPING, null, 2));
  const [name, setName] = useState("");
  const [result, setResult] = useState<null | ReturnType<typeof applyMapping>>(null);

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
              <ul className="mt-2 list-disc pl-5 text-xs text-destructive">
                {result.errors.map((e, i) => <li key={i}>{e}</li>)}
              </ul>
            )}
            {result.ok && result.draft && (
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-card p-2 text-[11px] leading-snug">
{JSON.stringify(result.draft, null, 2)}
              </pre>
            )}
          </div>
        )}

        <div className="rounded-lg border bg-card p-3 text-xs text-muted-foreground card-shadow">
          <strong className="text-foreground">Endpoint público:</strong>{" "}
          <code>POST /api/public/erp/ingest</code> — body{" "}
          <code>{`{ tenant_token, mapping, payload }`}</code>. Retorna draft validado.
        </div>
      </main>
      <Toaster position="top-right" richColors />
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
