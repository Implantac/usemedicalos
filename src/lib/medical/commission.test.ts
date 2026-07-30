import { describe, it, expect } from "vitest";
import { computeCommission, rateForMargin, tierLabel, DEFAULT_RULE } from "./commission";
import type { Quote } from "./types";

function q(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q_test",
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "email",
    status: "em_negociacao",
    priority: "normal",
    customer_name: "Test",
    customer_segment: "Hospital",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
    original_payload: "",
    keywords: [],
    items: [{ product_id: "p1", sku: "X", name: "X", quantity: 10, unit_price: 100, cost_price: 60 }],
    ...overrides,
  };
}

describe("commission", () => {
  it("rate scales with margin tiers", () => {
    expect(rateForMargin(0.05)).toBe(0);
    expect(rateForMargin(0.15)).toBe(0.02);
    expect(rateForMargin(0.25)).toBe(0.035);
    expect(rateForMargin(0.4)).toBe(0.05);
  });

  it("tierLabel maps rates", () => {
    expect(tierLabel(0.05)).toBe("Ouro");
    expect(tierLabel(0.035)).toBe("Prata");
    expect(tierLabel(0.02)).toBe("Bronze");
    expect(tierLabel(0)).toBe("Sem comissão");
  });

  it("computes SLA bonus when deadline is future", () => {
    const r = computeCommission(q()); // margin 40% → 5% + 0.5% sla
    expect(r.base_rate).toBe(0.05);
    expect(r.sla_bonus).toBe(DEFAULT_RULE.sla_bonus_rate);
    expect(r.total).toBeCloseTo(1000 * 0.055, 5);
  });

  it("no bonus and no commission when margin below floor", () => {
    const r = computeCommission(
      q({ items: [{ product_id: "p", sku: "X", name: "X", quantity: 1, unit_price: 100, cost_price: 95 }] }),
    );
    expect(r.base_rate).toBe(0);
    expect(r.total).toBe(0);
  });

  it("adds won bonus when status = ganho", () => {
    const r = computeCommission(q({ status: "ganho" }));
    expect(r.won_bonus).toBeGreaterThan(0);
  });
});
