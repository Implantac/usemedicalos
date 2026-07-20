import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority, Quote, QuoteItem, QuoteStatus, SourceType } from "@/lib/medical/types";
import { INITIAL_QUOTES, PRODUCTS, TENANTS } from "@/lib/medical/mock-data";
import { buildAutoDraft } from "@/lib/medical/auto-draft";
import { classify, slaHoursFor } from "@/lib/medical/classifier";
import { appendActivity } from "@/lib/medical/activity";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { slaHoursForTenant } from "@/lib/medical/tenant-config";
import { assertSameTenant, CrossTenantWriteError, type ActiveScope } from "@/lib/medical/tenant-guard";


const STORAGE_KEY = "use-medical:quotes:v2";

function load(): Quote[] {
  if (typeof window === "undefined") return INITIAL_QUOTES;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_QUOTES;
    const parsed = JSON.parse(raw) as Quote[];
    return Array.isArray(parsed) && parsed.length ? parsed : INITIAL_QUOTES;
  } catch {
    return INITIAL_QUOTES;
  }
}

export interface NewQuoteInput {
  owner_id: string;
  customer_name: string;
  customer_segment: string;
  source_type: SourceType;
  original_payload: string;
  items: QuoteItem[];
  priority_override?: Priority;
}

export function useQuotes() {
  const [allQuotes, setAllQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [hydrated, setHydrated] = useState(false);
  const { scope, tenant } = useActiveTenant();
  const { config: tenantConfig } = useTenantConfig(tenant?.id);
  const scopeRef = useRef<ActiveScope>(scope);
  scopeRef.current = scope;
  const tenantConfigRef = useRef(tenantConfig);
  tenantConfigRef.current = tenantConfig;

  useEffect(() => {
    setAllQuotes(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(allQuotes));
  }, [allQuotes, hydrated]);

  const quotes = useMemo(
    () => (scope === "all" ? allQuotes : allQuotes.filter((q) => q.tenant_id === scope)),
    [allQuotes, scope],
  );

  // Guard central: bloqueia mutação em quote de outro tenant (RLS mock).
  const guard = useCallback((quoteId: string, all: Quote[]) => {
    const target = all.find((q) => q.id === quoteId);
    if (!target) return null;
    try {
      assertSameTenant(target, scopeRef.current);
    } catch (err) {
      if (err instanceof CrossTenantWriteError) {
        console.warn("[tenant-guard]", err.message);
        appendActivity({
          quote_id: quoteId,
          type: "compliance_override",
          message: `Bloqueio anti-cross-tenant: escopo ${err.activeScope} tentou mutar ${err.attemptedTenant}`,
        });
      }
      return null;
    }
    return target;
  }, []);

  const updateQuote = useCallback((id: string, patch: Partial<Quote>) => {
    setAllQuotes((qs) => (guard(id, qs) ? qs.map((q) => (q.id === id ? { ...q, ...patch } : q)) : qs));
  }, [guard]);

  const updateItem = useCallback((quoteId: string, index: number, patch: Partial<QuoteItem>) => {
    setAllQuotes((qs) =>
      !guard(quoteId, qs)
        ? qs
        : qs.map((q) =>
            q.id !== quoteId
              ? q
              : { ...q, items: q.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) },
          ),
    );
  }, [guard]);

  const removeItem = useCallback((quoteId: string, index: number) => {
    setAllQuotes((qs) =>
      !guard(quoteId, qs)
        ? qs
        : qs.map((q) => (q.id !== quoteId ? q : { ...q, items: q.items.filter((_, i) => i !== index) })),
    );
  }, [guard]);

  const setStatus = useCallback(
    (id: string, status: QuoteStatus) => updateQuote(id, { status }),
    [updateQuote],
  );


  const addQuote = useCallback((input: NewQuoteInput): Quote => {
    const cls = classify(input.original_payload);
    const priority = input.priority_override ?? cls.priority;
    const sla = slaHoursForTenant(priority, tenantConfigRef.current);
    const now = new Date();
    const targetTenantId = tenant?.id ?? TENANTS[0].id;
    const q: Quote = {
      id: `q${Date.now().toString().slice(-6)}`,
      tenant_id: targetTenantId,
      owner_id: input.owner_id,
      source_type: input.source_type,
      status: "aguardando_precificacao",
      priority,
      customer_name: input.customer_name,
      customer_segment: input.customer_segment,
      received_at: now.toISOString(),
      sla_deadline: new Date(now.getTime() + sla * 3_600_000).toISOString(),
      original_payload: input.original_payload,
      keywords: cls.keywords,
      items: input.items,
      notes: "",
      use_sistemas_synced: false,
    };
    setAllQuotes((qs) => [q, ...qs]);
    appendActivity({ quote_id: q.id, type: "created", message: `Cotação criada para ${q.customer_name}` });
    return q;
  }, [tenant]);

  const ingestPortalQuote = useCallback((quote: Quote) => {
    setAllQuotes((qs) => {
      // Auto-draft: pré-precifica itens via engine e sugere tier via histórico.
      let drafted = quote;
      try {
        drafted = buildAutoDraft(quote, PRODUCTS, qs).quote;
      } catch (err) {
        console.warn("[auto-draft] falhou, seguindo com quote original", err);
      }
      appendActivity({
        quote_id: drafted.id,
        type: "ingested_from_portal",
        message: `RFQ capturada do portal ${drafted.portal_meta?.source_platform ?? "externo"} — ${drafted.customer_name}`,
        meta: {
          source_platform: drafted.portal_meta?.source_platform,
          portal_reference: drafted.portal_meta?.portal_reference,
          tier: drafted.client_tier,
        },
      });
      return [drafted, ...qs];
    });
  }, []);

  const markPortalResponded = useCallback((quoteId: string) => {
    setAllQuotes((qs) =>
      qs.map((q) =>
        q.id === quoteId && q.portal_meta && !q.portal_meta.response_at
          ? { ...q, portal_meta: { ...q.portal_meta, response_at: new Date().toISOString() } }
          : q,
      ),
    );
    appendActivity({
      quote_id: quoteId,
      type: "portal_response_taken",
      message: "Vendedor assumiu a RFQ e iniciou a precificação",
    });
  }, []);

  const resetDemo = useCallback(() => {
    setAllQuotes(INITIAL_QUOTES);
  }, []);

  const togglePin = useCallback((id: string) => {
    setAllQuotes((qs) => {
      if (!guard(id, qs)) return qs;
      return qs.map((q) => (q.id === id ? { ...q, pinned: !q.pinned } : q));
    });
  }, [guard]);

  const snoozeQuote = useCallback((id: string, until: string | null) => {
    setAllQuotes((qs) => {
      if (!guard(id, qs)) return qs;
      return qs.map((q) => (q.id === id ? { ...q, snoozed_until: until ?? undefined } : q));
    });
    appendActivity({
      quote_id: id,
      type: "compliance_override",
      message: until ? `Cotação adiada até ${new Date(until).toLocaleString("pt-BR")}` : "Cotação despertada",
    });
  }, [guard]);

  const reassignQuote = useCallback((id: string, ownerId: string) => {
    setAllQuotes((qs) => {
      const target = guard(id, qs);
      if (!target || target.owner_id === ownerId) return qs;
      return qs.map((q) => (q.id === id ? { ...q, owner_id: ownerId } : q));
    });
    appendActivity({
      quote_id: id,
      type: "compliance_override",
      message: `Cotação reatribuída ao vendedor ${ownerId}`,
    });
  }, [guard]);

  const appendNote = useCallback((id: string, text: string) => {
    const stamp = new Date().toLocaleString("pt-BR");
    const line = `[${stamp}] ${text}`;
    setAllQuotes((qs) => {
      if (!guard(id, qs)) return qs;
      return qs.map((q) =>
        q.id === id ? { ...q, notes: q.notes ? `${q.notes}\n${line}` : line } : q,
      );
    });
    appendActivity({
      quote_id: id,
      type: "compliance_override",
      message: `Nota adicionada: ${text.slice(0, 120)}${text.length > 120 ? "…" : ""}`,
    });
  }, [guard]);

  const duplicateQuote = useCallback((id: string): Quote | null => {
    const source = allQuotes.find((q) => q.id === id);
    if (!source) return null;
    try {
      assertSameTenant(source, scopeRef.current);
    } catch {
      return null;
    }
    const now = new Date();
    const sla = slaHoursFor(source.priority);
    const copy: Quote = {
      ...source,
      id: `q${Date.now().toString().slice(-6)}`,
      status: "aguardando_precificacao",
      received_at: now.toISOString(),
      sla_deadline: new Date(now.getTime() + sla * 3_600_000).toISOString(),
      use_sistemas_synced: false,
      use_sistemas_order_id: undefined,
      pinned: false,
      snoozed_until: undefined,
      notes: source.notes ? `${source.notes}\n[duplicada de #${source.id.toUpperCase()}]` : `Duplicada de #${source.id.toUpperCase()}`,
      items: source.items.map((it) => ({ ...it })),
    };
    setAllQuotes((qs) => [copy, ...qs]);
    appendActivity({
      quote_id: copy.id,
      type: "created",
      message: `Duplicada de #${source.id.toUpperCase()} — ${source.customer_name}`,
    });
    return copy;
  }, [allQuotes]);

  return {
    quotes,
    hydrated,
    addQuote,
    ingestPortalQuote,
    markPortalResponded,
    updateQuote,
    updateItem,
    removeItem,
    setStatus,
    togglePin,
    snoozeQuote,
    reassignQuote,
    appendNote,
    duplicateQuote,
    resetDemo,
  };
}

