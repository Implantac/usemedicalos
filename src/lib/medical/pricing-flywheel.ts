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

const HALF_LIFE_DAYS = 30;

function recencyWeight(iso: string, now = Date.now()): number {
  const ageDays = Math.max(0, (now - new Date(iso).getTime()) / 86_400_000);
  return Math.pow(0.5, ageDays / HALF_LIFE_DAYS);
}

export function computeMarketAverages(quotes: Quote[]): Map<string, MarketSample> {
  type Agg = { weightedSum: number; weightedQty: number; count: number; latest: string };
  const map = new Map<string, Agg>();
  for (const q of quotes) {
    if (q.status !== "ganho") continue;
    const w = recencyWeight(q.received_at);
    for (const it of q.items) {
      const cur: Agg = map.get(it.sku) ?? { weightedSum: 0, weightedQty: 0, count: 0, latest: q.received_at };
      cur.weightedSum += it.unit_price * it.quantity * w;
      cur.weightedQty += it.quantity * w;
      cur.count += 1;
      if (q.received_at > cur.latest) cur.latest = q.received_at;
      map.set(it.sku, cur);
    }
  }
  const out = new Map<string, MarketSample>();
  for (const [sku, s] of map) {
    out.set(sku, {
      sku,
      avg_price: s.weightedQty > 0 ? Math.round((s.weightedSum / s.weightedQty) * 100) / 100 : 0,
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
    if (s && s.sample_size >= 2) {
      return { ...p, market_avg: s.avg_price };
    }
    return p;
  });
}
