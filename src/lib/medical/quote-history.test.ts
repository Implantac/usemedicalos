import { describe, expect, it } from "vitest";
import type { Quote } from "./types";
import {
  applyHistoricalItems,
  findLastQuoteForCustomer,
  suggestReuseForCustomer,
} from "./quote-history";

function q(overrides: Partial<Quote> & { id: string; customer_name: string; received_at: string }): Quote {
  return {
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "email",
    status: "em_negociacao",
    priority: "normal",
    customer_segment: "Hospital",
    sla_deadline: new Date(Date.now() + 86_400_000).toISOString(),
    original_payload: "",
    keywords: [],
    items: [
      { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 100, cost_price: 60 },
    ],
    ...overrides,
  };
}

describe("quote-history", () => {
  it("findLastQuoteForCustomer returns the most recent quote for a customer", () => {
    const quotes = [
      q({ id: "q1", customer_name: "Hospital X", received_at: "2025-01-01T00:00:00Z" }),
      q({ id: "q2", customer_name: "Hospital X", received_at: "2025-02-01T00:00:00Z" }),
      q({ id: "q3", customer_name: "Outro", received_at: "2025-03-01T00:00:00Z" }),
    ];
    expect(findLastQuoteForCustomer(quotes, "Hospital X")?.id).toBe("q2");
  });

  it("findLastQuoteForCustomer ignores the current quote by excludeQuoteId", () => {
    const quotes = [
      q({ id: "q1", customer_name: "Hospital X", received_at: "2025-01-01T00:00:00Z" }),
      q({ id: "q2", customer_name: "Hospital X", received_at: "2025-02-01T00:00:00Z" }),
    ];
    expect(findLastQuoteForCustomer(quotes, "Hospital X", "q2")?.id).toBe("q1");
  });

  it("suggestReuseForCustomer returns suggestion with items and revenue", () => {
    const quotes = [
      q({ id: "q1", customer_name: "Hospital X", received_at: "2025-01-01T00:00:00Z" }),
    ];
    const suggestion = suggestReuseForCustomer(quotes, "Hospital X", "q1");
    expect(suggestion).toBeNull();
  });

  it("suggestReuseForCustomer returns suggestion excluding current", () => {
    const quotes = [
      q({
        id: "q1",
        customer_name: "Hospital X",
        received_at: "2025-01-01T00:00:00Z",
        items: [
          { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 100, cost_price: 60 },
          { product_id: "S2", sku: "S2", name: "Luvas", quantity: 5, unit_price: 50, cost_price: 30 },
        ],
      }),
    ];
    const suggestion = suggestReuseForCustomer(quotes, "Hospital X");
    expect(suggestion).not.toBeNull();
    expect(suggestion?.items).toHaveLength(2);
    expect(suggestion?.revenue).toBe(100 * 10 + 50 * 5);
  });

  it("applyHistoricalItems clones the last quote's items", () => {
    const quotes = [
      q({
        id: "q1",
        customer_name: "Hospital X",
        received_at: "2025-01-01T00:00:00Z",
        items: [
          { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 100, cost_price: 60 },
        ],
      }),
    ];
    const items = applyHistoricalItems(quotes, "Hospital X");
    expect(items).toHaveLength(1);
    expect(items[0].sku).toBe("S1");
    // A cópia não deve referenciar o mesmo objeto.
    expect(items[0]).not.toBe(quotes[0].items[0]);
  });

  it("applyHistoricalItems returns empty for unknown customer", () => {
    const items = applyHistoricalItems([], "Ninguém");
    expect(items).toEqual([]);
  });
});

