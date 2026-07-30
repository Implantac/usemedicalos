// Cache de preços com métricas — simula o proxy Redis planejado.
// Guarda sugestões da IA por (tenant, sku, quantity_bucket, targetMargin) e
// retorna instantaneamente em hits. Latência artificial de "miss" simula
// chamada de rede; hits são síncronos para provar o SLO <100ms.
//
// Migração: quando Cloud subir, trocar `memory` por `redis` (@upstash/redis)
// mantendo a mesma assinatura pública.

import type { QuoteItem } from "./types";
import { suggestPrice } from "./pricing";

interface Entry {
  value: number;
  storedAt: number;
  hits: number;
}

const TTL_MS = 5 * 60_000; // 5 min
const MAX_ENTRIES = 500;
const memory = new Map<string, Entry>();

interface Metrics {
  hits: number;
  misses: number;
  evictions: number;
  totalMissLatencyMs: number;
  lastMissLatencyMs: number;
}
const metrics: Metrics = {
  hits: 0,
  misses: 0,
  evictions: 0,
  totalMissLatencyMs: 0,
  lastMissLatencyMs: 0,
};

function bucketQty(q: number): number {
  if (q >= 100) return 100;
  if (q >= 50) return 50;
  if (q >= 20) return 20;
  if (q >= 5) return 5;
  return 1;
}

export function priceCacheKey(
  tenantId: string,
  item: Pick<QuoteItem, "sku" | "quantity" | "cost_price">,
  targetMargin: number,
): string {
  return `${tenantId}::${item.sku}::${bucketQty(item.quantity)}::${item.cost_price.toFixed(2)}::${targetMargin.toFixed(3)}`;
}

function evictIfNeeded() {
  if (memory.size <= MAX_ENTRIES) return;
  // LRU-ish: remove os mais antigos por storedAt.
  const sorted = Array.from(memory.entries()).sort((a, b) => a[1].storedAt - b[1].storedAt);
  const toDrop = sorted.slice(0, sorted.length - MAX_ENTRIES);
  for (const [k] of toDrop) memory.delete(k);
  metrics.evictions += toDrop.length;
}

export interface CachedPrice {
  value: number;
  cached: boolean;
  latencyMs: number;
}

export async function getCachedSuggestion(
  tenantId: string,
  item: QuoteItem,
  targetMargin: number,
): Promise<CachedPrice> {
  const key = priceCacheKey(tenantId, item, targetMargin);
  const now = Date.now();
  const hit = memory.get(key);
  if (hit && now - hit.storedAt < TTL_MS) {
    hit.hits += 1;
    metrics.hits += 1;
    return { value: hit.value, cached: true, latencyMs: 0 };
  }
  // Miss: simula custo de "chamada externa" de precificação.
  const start = now;
  await new Promise((r) => setTimeout(r, 45 + Math.random() * 35));
  const value = suggestPrice(item, targetMargin);
  const latency = Date.now() - start;
  memory.set(key, { value, storedAt: Date.now(), hits: 0 });
  evictIfNeeded();
  metrics.misses += 1;
  metrics.totalMissLatencyMs += latency;
  metrics.lastMissLatencyMs = latency;
  return { value, cached: false, latencyMs: latency };
}

export function getPriceCacheStats() {
  const total = metrics.hits + metrics.misses;
  const hitRate = total === 0 ? 0 : metrics.hits / total;
  const avgMissMs = metrics.misses === 0 ? 0 : metrics.totalMissLatencyMs / metrics.misses;
  return {
    ...metrics,
    size: memory.size,
    hitRate,
    avgMissMs,
  };
}

export function resetPriceCache() {
  memory.clear();
  metrics.hits = 0;
  metrics.misses = 0;
  metrics.evictions = 0;
  metrics.totalMissLatencyMs = 0;
  metrics.lastMissLatencyMs = 0;
}
