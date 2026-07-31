import { describe, expect, it } from "vitest";
import { groupQuoteItemsByErpProduct } from "./proposal-pdf";
import type { QuoteItem } from "./types";

const item = (o: Partial<QuoteItem> = {}): QuoteItem => ({
  product_id: "p1",
  sku: "SKU-1",
  name: "Item 1",
  quantity: 2,
  unit_price: 100,
  cost_price: 60,
  ...o,
});

describe("proposal-pdf grouping", () => {
  it("groups items by ERP product when confirmed", () => {
    const items = [
      { ...item(), matched: { product: { id: "ERP-1", name: "ERP Product" }, erpConfirmed: true } },
      { ...item({ sku: "SKU-2", name: "Item 2" }), matched: { product: { id: "ERP-1", name: "ERP Product" }, erpConfirmed: true } },
      { ...item({ sku: "SKU-3", name: "Item 3" }), matched: { product: { id: "ERP-2", name: "Another ERP" }, erpConfirmed: true } },
    ];

    const groups = groupQuoteItemsByErpProduct(items as any);
    expect(groups).toHaveLength(2);
    expect(groups[0]).toEqual({ label: "ERP Product", count: 2, total: 400 });
    expect(groups[1]).toEqual({ label: "Another ERP", count: 1, total: 200 });
  });

  it("falls back to classification label when ERP grouping is unavailable", () => {
    const items = [
      item({ sku: "SKU-1", name: "Item A" }),
      item({ sku: "SKU-2", name: "Item B" }),
    ];
    const groups = groupQuoteItemsByErpProduct(items as any);
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe("Sem classificação");
    expect(groups[0].count).toBe(2);
    expect(groups[0].total).toBe(400);
  });
});
