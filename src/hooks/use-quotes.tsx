import { useCallback, useEffect, useState } from "react";
import type { Quote, QuoteItem, QuoteStatus } from "@/lib/medical/types";
import { INITIAL_QUOTES } from "@/lib/medical/mock-data";

const STORAGE_KEY = "use-medical:quotes:v1";

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

  const resetDemo = useCallback(() => {
    setQuotes(INITIAL_QUOTES);
  }, []);

  return { quotes, hydrated, updateQuote, updateItem, removeItem, setStatus, resetDemo };
}
