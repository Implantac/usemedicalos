import { describe, it, expect } from "vitest";
import { computePricingCalibration } from "./pricing-calibration";
import type { Product, Quote } from "./types";

const product: Product = {
  id: "p1",
  name: "Cateter Central",
  sku: "SKU-1",
  cost_price: 10,
  last_suggested_price: 20,
  unit: "un",
  tax_rate: 0.18,
  logistics_rate: 0.03,
  market_avg: 20, // sugestão base ≈ 19.60
};

function makeWonQuote(unit_price: number, id = "q1"): Quote {
  return {
    id,
    tenant_id: "t1",
    owner_id: "o1",
    customer_name: "Hospital X",
    customer_segment: "hospital",
    source_type: "portal",
    original_payload: "",
    priority: "normal",
    status: "ganho",
    received_at: new Date().toISOString(),
    sla_deadline: new Date().toISOString(),
    keywords: [],
    items: [{ product_id: "p1", sku: "SKU-1", name: "Cateter", quantity: 10, unit_price, cost_price: 10 }],
    notes: "",
    use_sistemas_synced: false,
  };
}

describe("computePricingCalibration", () => {
  it("marca SKU como 'under' quando mercado paga acima do sugerido", () => {
    const rows = computePricingCalibration(
      [makeWonQuote(22), makeWonQuote(21.5, "q2")],
      [product],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].bias).toBe("under");
    expect(rows[0].median_delta).toBeGreaterThan(0.05);
  });

  it("marca SKU como 'aligned' quando fechamento bate a sugestão", () => {
    const rows = computePricingCalibration([makeWonQuote(19.6)], [product]);
    expect(rows[0].bias).toBe("aligned");
  });

  it("ignora quotes que não estão em 'ganho'", () => {
    const q = { ...makeWonQuote(30), status: "em_negociacao" as const };
    const rows = computePricingCalibration([q], [product]);
    expect(rows).toHaveLength(0);
  });
});
