import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Priority, Quote, QuoteItem, QuoteStatus, SourceType } from "@/lib/medical/types";
import { INITIAL_QUOTES, TENANTS } from "@/lib/medical/mock-data";
import { classify, slaHoursFor } from "@/lib/medical/classifier";
import { appendActivity } from "@/lib/medical/activity";
import { useActiveTenant } from "@/hooks/use-active-tenant";
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
  const scopeRef = useRef<ActiveScope>(scope);
  scopeRef.current = scope;

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
    const sla = slaHoursFor(priority);
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

  const resetDemo = useCallback(() => {
    setAllQuotes(INITIAL_QUOTES);
  }, []);

  return { quotes, hydrated, addQuote, updateQuote, updateItem, removeItem, setStatus, resetDemo };
}

