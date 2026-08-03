import { describe, expect, it } from "vitest";
import { captureSnapshot, diffSnapshot, restoreFromSnapshot, type QuoteSnapshot } from "./snapshot";
import type { Quote } from "./types";

function q(items: Quote["items"]): Quote {
  return {
    id: "q1",
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "email",
    status: "aguardando_precificacao",
    priority: "normal",
    customer_name: "Hospital X",
    customer_segment: "Hospital",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 86_400_000).toISOString(),
    original_payload: "",
    keywords: [],
    items,
  };
}

const item = (
  sku: string,
  name: string,
  quantity: number,
  unit_price: number,
  cost_price: number,
) => ({
  product_id: `p_${sku}`,
  sku,
  name,
  quantity,
  unit_price,
  cost_price,
});

describe("snapshot", () => {
  it("captureSnapshot stores item state and revenue/cost", () => {
    const quote = q([item("S1", "Seringa", 10, 100, 60), item("S2", "Luvas", 5, 50, 30)]);
    const snap = captureSnapshot(quote);
    expect(snap.quote_id).toBe("q1");
    expect(snap.items).toHaveLength(2);
    expect(snap.revenue).toBe(10 * 100 + 5 * 50);
    expect(snap.cost).toBe(10 * 60 + 5 * 30);
  });

  it("diffSnapshot reports unchanged when items match", () => {
    const quote = q([item("S1", "Seringa", 10, 100, 60)]);
    const snap = captureSnapshot(quote);
    const diff = diffSnapshot(snap, quote);
    expect(diff.unchanged).toBe(true);
    expect(diff.revenueDelta).toBe(0);
    expect(diff.items[0].priceChanged).toBe(false);
  });

  it("diffSnapshot detects price/qty changes and removed items", () => {
    const snapshot: QuoteSnapshot = {
      quote_id: "q1",
      captured_at: new Date().toISOString(),
      items: [item("S1", "Seringa", 10, 100, 60)],
      revenue: 1000,
      cost: 600,
    };
    const current = q([item("S1", "Seringa", 12, 120, 60)]);
    const diff = diffSnapshot(snapshot, current);
    expect(diff.unchanged).toBe(false);
    expect(diff.items[0].priceChanged).toBe(true);
    expect(diff.items[0].qtyChanged).toBe(true);
    expect(diff.revenueDelta).toBe(12 * 120 - 1000);
  });

  it("diffSnapshot marks removed items", () => {
    const snapshot: QuoteSnapshot = {
      quote_id: "q1",
      captured_at: new Date().toISOString(),
      items: [item("S1", "Seringa", 10, 100, 60), item("S2", "Luvas", 5, 50, 30)],
      revenue: 1250,
      cost: 750,
    };
    const current = q([item("S1", "Seringa", 10, 100, 60)]);
    const diff = diffSnapshot(snapshot, current);
    const removed = diff.items.find((d) => d.sku === "S2");
    expect(removed?.stillPresent).toBe(false);
    expect(diff.unchanged).toBe(false);
  });

  it("restoreFromSnapshot restores prices and quantities", () => {
    const snapshot: QuoteSnapshot = {
      quote_id: "q1",
      captured_at: new Date().toISOString(),
      items: [item("S1", "Seringa", 10, 100, 60)],
      revenue: 1000,
      cost: 600,
    };
    const current = q([item("S1", "Seringa", 20, 150, 70)]);
    const restored = restoreFromSnapshot(snapshot, current);
    expect(restored[0].quantity).toBe(10);
    expect(restored[0].unit_price).toBe(100);
    expect(restored[0].cost_price).toBe(60);
  });
});
