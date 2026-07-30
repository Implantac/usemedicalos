import { describe, it, expect } from "vitest";
import { calculateSuggestedPrice } from "./pricing-engine";

const base = {
  cost_price: 10,
  tax_rate: 0.18,
  logistics_rate: 0.03,
  cmed_ceiling: 30,
  market_avg: 20,
};

describe("calculateSuggestedPrice — 4 camadas", () => {
  it("retorna OPTIMAL quando mercado permite margem saudável", () => {
    const r = calculateSuggestedPrice(base);
    expect(r.status).toBe("OPTIMAL");
    // 20 * 0.98 = 19.60
    expect(r.suggested_price).toBeCloseTo(19.6, 2);
    expect(r.market_target).toBeCloseTo(19.6, 2);
  });

  it("aplica desconto por tier A (2%)", () => {
    const r = calculateSuggestedPrice(base, { tier: "A" });
    // 19.60 * 0.98 = 19.208 → 19.21
    expect(r.suggested_price).toBeCloseTo(19.21, 2);
    expect(r.tier_discount).toBe(0.02);
  });

  it("cai para floor quando market_target < floor (WARNING)", () => {
    const r = calculateSuggestedPrice({ ...base, market_avg: 5 });
    expect(r.status).toBe("WARNING");
    expect(r.suggested_price).toBe(r.floor_price);
  });

  it("respeita teto CMED (COMPLIANCE_LIMIT)", () => {
    const r = calculateSuggestedPrice({ ...base, market_avg: 100, cmed_ceiling: 25 });
    expect(r.status).toBe("COMPLIANCE_LIMIT");
    expect(r.suggested_price).toBe(25);
  });

  it("MARKET_MISSING quando não há market_avg", () => {
    const r = calculateSuggestedPrice({ ...base, market_avg: undefined });
    expect(r.status).toBe("MARKET_MISSING");
    expect(r.market_target).toBeUndefined();
  });

  it("MARKET_MISSING usa targetMargin do tenant como markup sobre o floor", () => {
    const r = calculateSuggestedPrice(
      { ...base, market_avg: undefined },
      { targetMargin: 0.5 },
    );
    // floor = 10 * 1.21 * 1.05 = 12.705 → 12.71; base = 12.71 * 1.5 = 19.065 → 19.07
    expect(r.status).toBe("MARKET_MISSING");
    expect(r.suggested_price).toBeCloseTo(19.07, 2);
  });

  it("BLOCKED quando floor excede o teto CMED", () => {
    const r = calculateSuggestedPrice({ ...base, cost_price: 100, cmed_ceiling: 50 });
    expect(r.status).toBe("BLOCKED");
    expect(r.suggested_price).toBe(50);
    expect(r.margin).toBeLessThan(0);
  });
});
