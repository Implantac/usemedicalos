import { useCallback, useEffect, useState } from "react";
import { Radio, Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { OWNERS } from "@/lib/medical/mock-data";
import {
  buildQuoteFromPayload,
  elapsedSincePortal,
  SOURCE_PLATFORM_LABEL,
  type IngestPayload,
} from "@/lib/medical/ingestion";
import type { SourcePlatform } from "@/lib/medical/types";
import type { IngestLogEntry } from "@/lib/medical/ingest-log";

// Cartão "Portais em tempo real" — simulador de RFQ + live-log do endpoint.
// - Simulador chama /api/v1/ingest com uma API key demo, exercitando a
//   validação Zod, rate-limit e ring-buffer server-side.
// - Live-log faz poll incremental via GET ?since=<iso>.

const DEMO_KEY = "demo-key-portal-2025";
const CUSTOMERS = [
  "Hospital Santa Marta",
  "Clínica São Lucas",
  "Instituto Cardio-BR",
  "UPA Central",
  "Hospital Vida & Saúde",
];
const PLATFORMS: SourcePlatform[] = ["bionexo", "apoio", "clickmed", "portal_gov"];
const CATALOG = [
  { sku: "MED-001", name: "Dipirona 500mg (cx c/200)" },
  { sku: "MAT-042", name: "Seringa descartável 10ml (cx c/100)" },
  { sku: "ORT-108", name: "Fio de sutura nylon 3-0" },
  { sku: "MED-217", name: "Omeprazol 40mg IV (fr)" },
];

function makePayload(): IngestPayload {
  const platform = PLATFORMS[Math.floor(Math.random() * PLATFORMS.length)];
  const customer = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const itemCount = 1 + Math.floor(Math.random() * 3);
  return {
    source_platform: platform,
    portal_reference: `RFQ-${Math.floor(Math.random() * 900_000 + 100_000)}`,
    portal_opened_at: new Date(Date.now() - Math.random() * 15 * 60_000).toISOString(),
    customer_name: customer,
    customer_segment: "hospital",
    items: Array.from({ length: itemCount }).map(() => {
      const p = CATALOG[Math.floor(Math.random() * CATALOG.length)];
      return { sku: p.sku, name: p.name, quantity: 10 + Math.floor(Math.random() * 400) };
    }),
  };
}

export function PortalMonitorCard() {
  const [entries, setEntries] = useState<IngestLogEntry[]>([]);
  const [sending, setSending] = useState(false);
  const [apiKey, setApiKey] = useState(DEMO_KEY);
  const { ingestPortalQuote } = useQuotes();
  const { tenant } = useActiveTenant();

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/v1/ingest", { headers: { Accept: "application/json" } });
      if (!res.ok) return;
      const data = (await res.json()) as { events: IngestLogEntry[] };
      setEntries(data.events ?? []);
    } catch {
      /* dev server pode não ter subido ainda */
    }
  }, []);

  useEffect(() => {
    poll();
    const t = window.setInterval(poll, 4000);
    return () => window.clearInterval(t);
  }, [poll]);

  const simulate = useCallback(async () => {
    if (sending) return;
    setSending(true);
    const payload = makePayload();
    try {
      const res = await fetch("/api/v1/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok || !body?.ok) {
        toast.error(`Ingest rejeitado (${res.status}): ${body?.error ?? "erro"}`);
      } else {
        toast.success(`RFQ ${payload.portal_reference} aceita — ${SOURCE_PLATFORM_LABEL[payload.source_platform]}`);
        // Persistência local: cria a Quote no scope do tenant ativo (mock).
        const tenantId = tenant?.id ?? "t_demo";
        const ownerId = OWNERS[0]?.id ?? "owner_demo";
        ingestPortalQuote(buildQuoteFromPayload(payload, { tenantId, ownerId }));
      }
      poll();
    } catch (err) {
      toast.error(`Falha de rede: ${err instanceof Error ? err.message : "desconhecida"}`);
    } finally {
      setSending(false);
    }
  }, [apiKey, ingestPortalQuote, poll, sending, tenant]);

  return (
    <section className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 text-sm font-bold text-foreground">
            <Radio className="h-3.5 w-3.5 text-brand" />
            Portais em tempo real
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Endpoint <code>POST /api/v1/ingest</code> — a extensão do navegador captura RFQs de Bionexo/Apoio/ClickMed e envia aqui. Rate-limit 60 req/min, autenticação por <code>x-api-key</code>.
          </p>
        </div>
        <Button size="sm" onClick={simulate} disabled={sending} className="gap-1.5">
          <Sparkles className="h-3.5 w-3.5" />
          {sending ? "Enviando..." : "Simular RFQ"}
        </Button>
      </div>

      <div className="mb-2 flex items-center gap-2">
        <label className="text-[11px] font-semibold text-muted-foreground">x-api-key</label>
        <Input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          className="h-7 max-w-[220px] font-mono text-[11px]"
        />
      </div>

      <div className="rounded border bg-background">
        <div className="border-b bg-muted/40 px-2 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          Live-log ({entries.length})
        </div>
        <ul className="max-h-64 divide-y divide-border overflow-y-auto text-[11px]">
          {entries.length === 0 && (
            <li className="p-3 text-center text-muted-foreground">
              Nenhum evento ainda — clique em "Simular RFQ" ou envie um POST real.
            </li>
          )}
          {entries.map((e) => (
            <li key={e.id} className="flex items-center gap-2 px-2 py-1.5">
              <span
                className={
                  e.status === "accepted"
                    ? "inline-flex h-4 items-center rounded bg-success/15 px-1.5 text-[10px] font-bold text-success"
                    : "inline-flex h-4 items-center rounded bg-destructive/15 px-1.5 text-[10px] font-bold text-destructive"
                }
              >
                {e.status === "accepted" ? "OK" : "ERR"}
              </span>
              <span className="w-20 truncate font-semibold text-foreground">
                {SOURCE_PLATFORM_LABEL[e.source_platform as SourcePlatform] ?? e.source_platform}
              </span>
              <span className="w-24 truncate font-mono text-muted-foreground">{e.portal_reference}</span>
              <span className="min-w-0 flex-1 truncate">{e.customer_name}</span>
              <span className="w-8 text-right num text-muted-foreground">{e.item_count}i</span>
              <span className="w-14 text-right text-muted-foreground">{elapsedSincePortal(e.received_at)}</span>
              {e.reason && <span className="text-[10px] text-destructive">{e.reason}</span>}
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
        <Send className="h-3 w-3" /> Payloads aceitos criam cotações com status{" "}
        <strong className="text-brand">pending_review</strong> — visíveis na Inbox e no SLA Watchdog.
      </p>
    </section>
  );
}
