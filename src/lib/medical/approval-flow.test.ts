import { describe, expect, it } from "vitest";
import { buildApprovalSummary, needsApproval } from "./approval-flow";
import type { QuoteItem } from "./types";

const item = (o: Partial<QuoteItem> = {}): QuoteItem => ({
  product_id: "p1",
  sku: "SKU-1",
  name: "Item",
  quantity: 2,
  unit_price: 100,
  cost_price: 70,
  ...o,
});

describe("approval-flow", () => {
  it("builds a summary with revenue, cost and margin", () => {
    const summary = buildApprovalSummary([item(), item({ quantity: 1, unit_price: 80, cost_price: 50 })]);
    expect(summary.revenue).toBe(280);
    expect(summary.cost).toBe(190);
    expect(summary.margin).toBeCloseTo(90 / 280);
  });

  it("needs approval only when margin is below threshold", () => {
    expect(needsApproval(0.1, 0.12)).toBe(true);
    expect(needsApproval(0.12, 0.12)).toBe(false);
    expect(needsApproval(0.2, 0.12)).toBe(false);
  });
});
