// Autopreenchimento de itens repetidos (Melhoria B).
// Sugere itens/quantidades/preços da última cotação do mesmo cliente.

import type { Quote, QuoteItem } from "./types";

export interface QuoteHistorySuggestion {
  quoteId: string;
  customerName: string;
  customerSegment: string;
  receivedAt: string;
  status: Quote["status"];
  items: QuoteItem[];
  revenue: number;
}

/** Retorna a cotação mais recente do cliente (ignorando a atual), se houver. */
export function findLastQuoteForCustomer(
  quotes: Quote[],
  customerName: string,
  excludeQuoteId?: string,
): Quote | null {
  return quotes
    .filter((q) => q.customer_name === customerName && q.id !== excludeQuoteId)
    .sort((a, b) => (a.received_at < b.received_at ? 1 : -1))[0] ?? null;
}

/** Constrói a sugestão reutilizável a partir de uma cotação anterior. */
export function buildReuseSuggestion(previous: Quote): QuoteHistorySuggestion {
  const revenue = previous.items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  return {
    quoteId: previous.id,
    customerName: previous.customer_name,
    customerSegment: previous.customer_segment,
    receivedAt: previous.received_at,
    status: previous.status,
    items: previous.items.map((it) => ({ ...it })),
    revenue,
  };
}

/**
 * Dado o histórico e o cliente atual, devolve a sugestão de reutilização
 * (última cotação do mesmo cliente) ou null se não existir.
 */
export function suggestReuseForCustomer(
  quotes: Quote[],
  customerName: string,
  excludeQuoteId?: string,
): QuoteHistorySuggestion | null {
  const previous = findLastQuoteForCustomer(quotes, customerName, excludeQuoteId);
  if (!previous) return null;
  return buildReuseSuggestion(previous);
}

/** Aplica a sugestão a um conjunto de itens (copia os dados da última cotação). */
export function applyHistoricalItems(
  quotes: Quote[],
  customerName: string,
  excludeQuoteId?: string,
): QuoteItem[] {
  const suggestion = suggestReuseForCustomer(quotes, customerName, excludeQuoteId);
  if (!suggestion) return [];
  return suggestion.items.map((it) => ({ ...it }));
}
