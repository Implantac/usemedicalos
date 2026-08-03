import { describe, expect, it } from "vitest";
import { computeAchievements, consecutiveGoalStreak } from "./achievements";
import type { Quote } from "./types";

function dayAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

function futureDeadline(hours: number): string {
  return new Date(Date.now() + hours * 3_600_000).toISOString();
}

function q(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q_test",
    tenant_id: "t1",
    owner_id: "u1",
    source_type: "email",
    status: "aguardando_precificacao",
    priority: "normal",
    customer_name: "Test",
    customer_segment: "Hospital",
    received_at: new Date().toISOString(),
    sla_deadline: futureDeadline(24),
    original_payload: "",
    keywords: [],
    items: [
      { product_id: "p1", sku: "X", name: "X", quantity: 10, unit_price: 100, cost_price: 60 },
    ],
    ...overrides,
  };
}

describe("achievements", () => {
  it("unlocks precision when average margin > 20%", () => {
    const quotes = [
      q({
        items: [
          { product_id: "p1", sku: "X", name: "X", quantity: 1, unit_price: 100, cost_price: 70 },
        ],
      }),
    ];
    const result = computeAchievements("u1", quotes);
    const precision = result.find((a) => a.id === "precision");
    expect(precision?.unlocked).toBe(true);
  });

  it("unlocks speed when most open quotes are within SLA", () => {
    const quotes = [
      q(), // future SLA → ok
      q({ status: "em_negociacao" }), // future SLA → ok
    ];
    const result = computeAchievements("u1", quotes);
    const speed = result.find((a) => a.id === "speed");
    expect(speed?.unlocked).toBe(true);
  });

  it("unlocks rocket with 5+ wins this month", () => {
    // Todos os recebimentos dentro do mês atual (evita borda de mês).
    const now = new Date();
    const inMonth = (offsetDays: number) =>
      new Date(now.getFullYear(), now.getMonth(), Math.max(1, 1 + offsetDays), 12).toISOString();
    const quotes = Array.from({ length: 5 }, (_, i) =>
      q({ id: `w${i}`, status: "ganho", received_at: inMonth(i) }),
    );
    const result = computeAchievements("u1", quotes);
    const rocket = result.find((a) => a.id === "rocket");
    expect(rocket?.unlocked).toBe(true);
  });

  it("unlocks focus when all open quotes are on time", () => {
    const quotes = [q(), q({ status: "em_negociacao" }), q({ status: "enviado" })];
    const result = computeAchievements("u1", quotes);
    const focus = result.find((a) => a.id === "focus");
    expect(focus?.unlocked).toBe(true);
  });

  it("does not unlock achievements for another owner", () => {
    const quotes = [q()];
    const result = computeAchievements("u2", quotes);
    const anyUnlocked = result.filter((a) => a.unlocked);
    expect(anyUnlocked).toHaveLength(0);
  });

  it("consecutiveGoalStreak returns 0 when no revenue today", () => {
    expect(consecutiveGoalStreak([q()], 999_999)).toBe(0);
  });
});
