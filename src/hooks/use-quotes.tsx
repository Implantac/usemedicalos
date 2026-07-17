import { useCallback, useEffect, useState } from "react";
import type { Priority, Quote, QuoteItem, QuoteStatus, SourceType } from "@/lib/medical/types";
import { INITIAL_QUOTES, TENANT } from "@/lib/medical/mock-data";
import { classify, slaHoursFor } from "@/lib/medical/classifier";
import { appendActivity } from "@/lib/medical/activity";

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
  const [quotes, setQuotes] = useState<Quote[]>(INITIAL_QUOTES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setQuotes(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(quotes));
  }, [quotes, hydrated]);

  const updateQuote = useCallback((id: string, patch: Partial<Quote>) => {
    setQuotes((qs) => qs.map((q) => (q.id === id ? { ...q, ...patch } : q)));
  }, []);

  const updateItem = useCallback((quoteId: string, index: number, patch: Partial<QuoteItem>) => {
    setQuotes((qs) =>
      qs.map((q) =>
        q.id !== quoteId
          ? q
          : { ...q, items: q.items.map((it, i) => (i === index ? { ...it, ...patch } : it)) },
      ),
    );
  }, []);

  const removeItem = useCallback((quoteId: string, index: number) => {
    setQuotes((qs) =>
      qs.map((q) => (q.id !== quoteId ? q : { ...q, items: q.items.filter((_, i) => i !== index) })),
    );
  }, []);

  const setStatus = useCallback(
    (id: string, status: QuoteStatus) => updateQuote(id, { status }),
    [updateQuote],
  );

  const addQuote = useCallback((input: NewQuoteInput): Quote => {
    const cls = classify(input.original_payload);
    const priority = input.priority_override ?? cls.priority;
    const sla = slaHoursFor(priority);
    const now = new Date();
    const q: Quote = {
      id: `q${Date.now().toString().slice(-6)}`,
      tenant_id: TENANT.id,
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
    setQuotes((qs) => [q, ...qs]);
    appendActivity({ quote_id: q.id, type: "created", message: `Cotação criada para ${q.customer_name}` });
    return q;
  }, []);

  const resetDemo = useCallback(() => {
    setQuotes(INITIAL_QUOTES);
  }, []);

  return { quotes, hydrated, addQuote, updateQuote, updateItem, removeItem, setStatus, resetDemo };
}
