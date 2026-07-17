import { describe, expect, it } from "vitest";
import { buildAutoDraft } from "./auto-draft";
import type { Product, Quote } from "./types";

const product: Product = {
  id: "p1",
  name: "Seringa 10ml",
  sku: "SKU-001",
  cost_price: 1,
  last_suggested_price: 2,
  unit: "un",
  tax_rate: 0.18,
  market_avg: 3,
};

const baseQuote: Quote = {
  id: "q1",
  tenant_id: "t1",
  owner_id: "o1",
  source_type: "portal",
  status: "pending_review",
  priority: "alta",
  customer_name: "Hospital Alfa",
  customer_segment: "hospital",
  received_at: new Date().toISOString(),
  sla_deadline: new Date(Date.now() + 3_600_000).toISOString(),
  original_payload: "",
  keywords: [],
  items: [{ product_id: "p1", sku: "SKU-001", name: "Seringa 10ml", quantity: 100, unit_price: 0, cost_price: 0 }],
};

describe("buildAutoDraft", () => {
  it("preenche unit_price via engine e propõe tier C sem histórico", () => {
    const r = buildAutoDraft(baseQuote, [product], []);
    expect(r.items_priced).toBe(1);
    expect(r.items_skipped).toBe(0);
    expect(r.quote.items[0].unit_price).toBeGreaterThan(0);
    expect(r.suggested_tier).toBe("C");
    expect(r.quote.client_tier).toBe("C");
  });

  it("pula itens sem produto no catálogo", () => {
    const q: Quote = { ...baseQuote, items: [{ ...baseQuote.items[0], sku: "DESCONHECIDO" }] };
    const r = buildAutoDraft(q, [product], []);
    expect(r.items_priced).toBe(0);
    expect(r.items_skipped).toBe(1);
  });

  it("propõe tier A com histórico ≥3 wins e win-rate ≥60%", () => {
    const win: Quote = { ...baseQuote, id: "h", status: "ganho" };
    const history = [win, { ...win, id: "h2" }, { ...win, id: "h3" }];
    const r = buildAutoDraft(baseQuote, [product], history);
    expect(r.suggested_tier).toBe("A");
  });
});
