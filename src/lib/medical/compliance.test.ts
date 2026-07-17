import { describe, it, expect } from "vitest";
import { checkItem, checkQuote } from "./compliance";
import type { Quote, QuoteItem } from "./types";

const baseItem: QuoteItem = {
  product_id: "p", sku: "SUT-3-0-CT", name: "Sutura", quantity: 10, unit_price: 25, cost_price: 18.5,
};

describe("compliance", () => {
  it("ok when within CMED and ANVISA valid", () => {
    expect(checkItem(baseItem).status).toBe("ok");
  });

  it("blocked when unit_price exceeds CMED PMC", () => {
    const r = checkItem({ ...baseItem, unit_price: 999 });
    expect(r.status).toBe("blocked");
    expect(r.reason).toMatch(/CMED/);
  });

  it("warning when SKU has no registry", () => {
    const r = checkItem({ ...baseItem, sku: "UNKNOWN" });
    expect(r.status).toBe("warning");
  });

  it("quote report aggregates worst status", () => {
    const quote: Quote = {
      id: "q", tenant_id: "t", owner_id: "u", source_type: "email", status: "em_negociacao",
      priority: "normal", customer_name: "x", customer_segment: "x",
      received_at: new Date().toISOString(), sla_deadline: new Date().toISOString(),
      original_payload: "", keywords: [],
      items: [baseItem, { ...baseItem, sku: "SER-20ML", unit_price: 999 }],
    };
    const r = checkQuote(quote);
    expect(r.status).toBe("blocked");
    expect(r.blocked_count).toBe(1);
  });
});
