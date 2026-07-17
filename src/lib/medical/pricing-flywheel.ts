// Data Flywheel — captura preços reais de fechamento e recalcula market_avg.
// Mock: lê quotes com status "ganho" do localStorage e agrega por SKU.
// Migração Cloud: substituir por materialized view sobre quote_items + status='ganho'.

import type { Product, Quote } from "./types";

export interface MarketSample {
  sku: string;
  avg_price: number;
  sample_size: number;
  last_updated: string;
}

export function computeMarketAverages(quotes: Quote[]): Map<string, MarketSample> {
  const map = new Map<string, { sum: number; qty: number; count: number; latest: string }>();
  for (const q of quotes) {
    if (q.status !== "ganho") continue;
    for (const it of q.items) {
      const cur = map.get(it.sku) ?? { sum: 0, qty: 0, count: 0, latest: q.received_at };
      cur.sum += it.unit_price * it.quantity;
      cur.qty += it.quantity;
      cur.count += 1;
      if (q.received_at > cur.latest) cur.latest = q.received_at;
      map.set(it.sku, cur);
    }
  }
  const out = new Map<string, MarketSample>();
  for (const [sku, s] of map) {
    out.set(sku, {
      sku,
      avg_price: Math.round((s.sum / s.qty) * 100) / 100,
      sample_size: s.count,
      last_updated: s.latest,
    });
  }
  return out;
}

/** Aplica overrides de market_avg em uma lista de produtos, sem mutar o original. */
export function enrichProductsWithMarket(products: Product[], quotes: Quote[]): Product[] {
  const samples = computeMarketAverages(quotes);
  return products.map((p) => {
    const s = samples.get(p.sku);
    // Sample mínimo = 2 fechamentos para não ancorar em outlier
    if (s && s.sample_size >= 2) {
      return { ...p, market_avg: s.avg_price };
    }
    return p;
  });
}
