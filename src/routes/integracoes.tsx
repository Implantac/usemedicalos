import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, PlayCircle } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import {
  applyMapping,
  SAMPLE_ERP_PAYLOAD,
  SAMPLE_MAPPING,
  type ErpMappingConfig,
} from "@/lib/medical/erp-mapping";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/integracoes")({
  head: () => ({
    meta: [
      { title: "Portal de Integrações — USE Medical" },
      {
        name: "description",
        content:
          "Sandbox self-service para mapear campos do seu ERP e testar a integração antes de ir a produção.",
      },
    ],
  }),
  component: IntegrationsPage,
});

function IntegrationsPage() {
  const [payload, setPayload] = useState(() => JSON.stringify(SAMPLE_ERP_PAYLOAD, null, 2));
  const [mapping, setMapping] = useState(() => JSON.stringify(SAMPLE_MAPPING, null, 2));
  const [result, setResult] = useState<null | ReturnType<typeof applyMapping>>(null);

  const [payloadErr, mappingErr] = useMemo(() => {
    let pe: string | null = null;
    let me: string | null = null;
    try { JSON.parse(payload); } catch (e) { pe = (e as Error).message; }
    try { JSON.parse(mapping); } catch (e) { me = (e as Error).message; }
    return [pe, me];
  }, [payload, mapping]);

  function run() {
    if (payloadErr || mappingErr) {
      toast.error("Corrija o JSON antes de testar.");
      return;
    }
    try {
      const p = JSON.parse(payload);
      const m: ErpMappingConfig = JSON.parse(mapping);
      const r = applyMapping(p, m);
      setResult(r);
      if (r.ok) toast.success("Payload mapeado com sucesso.");
      else toast.error(`${r.errors.length} erro(s) de mapeamento.`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">
              Portal de integrações
            </h1>
            <p className="text-xs text-muted-foreground">
              Mapeie os campos do seu ERP para o formato interno. Teste no sandbox antes de publicar.
            </p>
          </div>
          <Button size="sm" onClick={run} className="gap-1.5">
            <PlayCircle className="h-4 w-4" /> Testar mapeamento
          </Button>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <Editor
            title="Payload do ERP (exemplo)"
            value={payload}
            onChange={setPayload}
            error={payloadErr}
          />
          <Editor
            title="Configuração de mapeamento (JSONPath)"
            value={mapping}
            onChange={setMapping}
            error={mappingErr}
          />
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
          <strong className="text-foreground">Dica:</strong> use notação de caminho <code>a.b[0].c</code>.
          Após validado, este mapeamento pode ser salvo como configuração do tenant e usado
          pelo webhook público em <code>/api/public/erp/ingest</code>.
        </div>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}

function Editor({
  title,
  value,
  onChange,
  error,
}: {
  title: string;
  value: string;
  onChange: (v: string) => void;
  error: string | null;
}) {
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
