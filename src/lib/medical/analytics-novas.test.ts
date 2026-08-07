import { describe, expect, it } from "vitest";
import type { Quote } from "./types";
import { marginLeftOnTable, sourceConversion, teamLeaderboard } from "./analytics";

function q(overrides: Partial<Quote> = {}): Quote {
  return {
    id: Math.random().toString(36).slice(2, 8),
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "email",
    status: "em_negociacao",
    priority: "normal",
    customer_name: "Hospital X",
    customer_segment: "Hospital",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 86_400_000).toISOString(),
    original_payload: "",
    keywords: [],
    items: [
      { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 100, cost_price: 60 },
    ],
    ...overrides,
  };
}

describe("sourceConversion", () => {
  it("computes response rate and win rate per source", () => {
    const quotes = [
      q({ id: "a1", source_type: "email", status: "ganho" }),
      q({ id: "a2", source_type: "email", status: "aguardando_precificacao" }),
      q({ id: "b1", source_type: "portal", status: "perdido" }),
    ];
    const rows = sourceConversion(quotes);
    const email = rows.find((r) => r.source === "email");
    expect(email?.count).toBe(2);
    expect(email?.won).toBe(1);
    const portal = rows.find((r) => r.source === "portal");
    expect(portal?.lost).toBe(1);
    expect(portal?.winRate).toBe(0);
  });
});

describe("marginLeftOnTable", () => {
  it("returns positive margin left when closed price is below suggestion", () => {
    // custo 60; preço fechado 100 (margem 40%).
    const won = q({ id: "w1", status: "ganho" });
    const metric = marginLeftOnTable([won]);
    expect(metric.quoteCount).toBe(1);
    expect(metric.totalRevenue).toBeGreaterThan(0);
    expect(metric.realizedMargin).toBeGreaterThan(0);
  });

  it("excludes lost and pending quotes from quoteCount", () => {
    const quotes = [
      q({ id: "w1", status: "ganho" }),
      q({ id: "l1", status: "perdido" }),
      q({ id: "p1", status: "aguardando_precificacao" }),
    ];
    const metric = marginLeftOnTable(quotes);
    expect(metric.quoteCount).toBe(1);
  });
});

describe("teamLeaderboard", () => {
  it("builds rows with commission and win rate for owners with quotes", () => {
    const quotes = [q({ id: "w1", owner_id: "u_ana", status: "ganho" })];
    const rows = teamLeaderboard(quotes);
    const mine = rows.filter((r) => r.ownerId === "u_ana");
    expect(mine.length).toBe(1);
    expect(mine[0].quotes).toBe(1);
    expect(mine[0].winRate).toBe(1);
    expect(mine[0].commissionWon).toBeGreaterThanOrEqual(0);
  });
});
