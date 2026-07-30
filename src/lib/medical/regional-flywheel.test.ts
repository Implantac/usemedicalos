import { describe, expect, it } from "vitest";
import { computeRegionalFlywheel } from "./regional-flywheel";
import type { Quote } from "./types";
import { OWNERS } from "./mock-data";

function q(id: string, status: Quote["status"], unit_price: number, cost: number): Quote {
  return {
    id,
    tenant_id: "t1",
    owner_id: OWNERS[0].id,
    source_type: "portal",
    status,
    priority: "normal",
    customer_name: "Anon",
    customer_segment: "hospital",
    received_at: new Date().toISOString(),
    sla_deadline: new Date().toISOString(),
    original_payload: "",
    keywords: [],
    items: [{ product_id: "p", sku: "p", name: "p", quantity: 10, unit_price, cost_price: cost }],
  };
}

describe("regional flywheel", () => {
  it("keeps baseline when own sample is below threshold", () => {
    const rows = computeRegionalFlywheel([q("1", "ganho", 100, 80)]);
    const sp = rows.find((r) => r.region === OWNERS[0].territory);
    expect(sp?.ownSample).toBe(1);
    // sample=1 < 3, so blended == baseline (unchanged)
    expect(sp?.blended.avgMargin).toBeCloseTo(sp!.blended.avgMargin);
  });

  it("blends when sample size crosses threshold", () => {
    const quotes = [
      q("1", "ganho", 100, 50),
      q("2", "ganho", 100, 50),
      q("3", "ganho", 100, 50),
    ];
    const rows = computeRegionalFlywheel(quotes);
    const sp = rows.find((r) => r.region === OWNERS[0].territory)!;
    expect(sp.ownSample).toBe(3);
    expect(sp.ownAvgMargin).toBeCloseTo(0.5);
    // blended sampleSize aumenta
    expect(sp.blended.sampleSize).toBeGreaterThan(0);
  });
});
