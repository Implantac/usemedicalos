import { beforeEach, describe, expect, it } from "vitest";
import {
  getCachedSuggestion,
  getPriceCacheStats,
  priceCacheKey,
  resetPriceCache,
} from "./price-cache";
import type { QuoteItem } from "./types";

const item: QuoteItem = {
  product_id: "p1",
  sku: "SKU-1",
  name: "Cateter",
  quantity: 10,
  unit_price: 0,
  cost_price: 100,
};

describe("price-cache", () => {
  beforeEach(() => resetPriceCache());

  it("miss preenche o cache e hit responde <5ms", async () => {
    const first = await getCachedSuggestion("tnt_a", item, 0.28);
    expect(first.cached).toBe(false);
    const second = await getCachedSuggestion("tnt_a", item, 0.28);
    expect(second.cached).toBe(true);
    expect(second.latencyMs).toBeLessThan(5);
    expect(second.value).toBe(first.value);
  });

  it("chave isola por tenant", () => {
    const k1 = priceCacheKey("tnt_a", item, 0.28);
    const k2 = priceCacheKey("tnt_b", item, 0.28);
    expect(k1).not.toBe(k2);
  });

  it("bucket de quantidade agrupa próximos volumes", () => {
    const q10 = priceCacheKey("t", { ...item, quantity: 10 }, 0.28);
    const q15 = priceCacheKey("t", { ...item, quantity: 15 }, 0.28);
    expect(q10).toBe(q15);
  });

  it("stats reportam hit-rate corretamente", async () => {
    await getCachedSuggestion("tnt_a", item, 0.28);
    await getCachedSuggestion("tnt_a", item, 0.28);
    await getCachedSuggestion("tnt_a", item, 0.28);
    const s = getPriceCacheStats();
    expect(s.hits).toBe(2);
    expect(s.misses).toBe(1);
    expect(s.hitRate).toBeCloseTo(2 / 3, 2);
  });
});
