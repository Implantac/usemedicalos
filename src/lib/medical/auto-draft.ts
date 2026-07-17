// Auto-Draft — ao ingerir uma RFQ do portal, pré-calcula preços via
// pricing-engine para cada item e propõe tier default via client-intel.
// Roda 100% no client (mock). Migra para edge function on-write via trigger.

import type { ClientTier, Product, Quote } from "./types";
import { calculateSuggestedPrice } from "./pricing-engine";
import { suggestTier } from "./client-intel";

export interface AutoDraftResult {
  quote: Quote;
  suggested_tier: ClientTier;
  items_priced: number;
  items_skipped: number; // sem produto correspondente no catálogo
}

/**
 * Enriquece uma quote recém-ingerida com preços sugeridos e tier default.
 * Não muta a quote original.
 */
export function buildAutoDraft(
  quote: Quote,
  products: Product[],
  history: Quote[],
): AutoDraftResult {
  const bySku = new Map(products.map((p) => [p.sku, p]));

  // Tier sugerido a partir do histórico do cliente (fuzzy: nome normalizado).
  const key = quote.customer_name.trim().toLowerCase().replace(/\s+/g, " ");
  const priors = history.filter(
    (q) => q.id !== quote.id && q.customer_name.trim().toLowerCase().replace(/\s+/g, " ") === key,
  );
  const wins = priors.filter((q) => q.status === "ganho").length;
  const winRate = priors.length ? wins / priors.length : 0;
  const tier = suggestTier(winRate, priors.length);

  let priced = 0;
  let skipped = 0;
  const items = quote.items.map((it) => {
    const p = bySku.get(it.sku);
    if (!p) {
      skipped += 1;
      return it;
    }
    const breakdown = calculateSuggestedPrice(p, { tier, quantity: it.quantity });
    priced += 1;
    return {
      ...it,
      unit_price: breakdown.suggested_price,
      cost_price: p.cost_price,
    };
  });

  return {
    quote: { ...quote, items, client_tier: tier },
    suggested_tier: tier,
    items_priced: priced,
    items_skipped: skipped,
  };
}
