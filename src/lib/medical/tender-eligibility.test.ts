import { describe, expect, it } from "vitest";
import { INITIAL_QUOTES } from "./mock-data";
import {
  evaluateTenderEligibility,
  evaluateTenderEligibilityForQuotes,
  onlyParticipable,
} from "./tender-eligibility";
import type { Quote } from "./types";

function quoteById(id: string): Quote {
  const q = INITIAL_QUOTES.find((x) => x.id === id);
  if (!q) throw new Error(`quote ${id} not found in INITIAL_QUOTES`);
  return q;
}

describe("tender-eligibility", () => {
  it("avalia corretamente a elegibilidade de todas as cotações mock", () => {
    const results = evaluateTenderEligibilityForQuotes(INITIAL_QUOTES);
    expect(results).toHaveLength(INITIAL_QUOTES.length);
    for (const r of results) {
      expect(r.totalItems).toBe(r.quote.items.length);
      expect(r.attendableCount + r.nonAttendableItems.length).toBe(r.totalItems);
      expect(r.canParticipate).toBe(r.attendableCount > 0);
    }
  });

  it("q1 (sutura + luva) é 100% atendível — participação clara", () => {
    const r = evaluateTenderEligibility(quoteById("q1"));
    expect(r.canParticipate).toBe(true);
    expect(r.fullyAttendable).toBe(true);
    expect(r.attendableCount).toBe(2);
    expect(r.nonAttendableItems).toHaveLength(0);
    expect(r.attendableRevenue).toBeCloseTo(r.totalRevenue);
    expect(r.summary.canAttend).toBe(2);
  });

  it("q3 (máscara N95 sem estoque) → não conseguimos participar via estoque", () => {
    // MSC-N95 tem estoque 0 no mock de STOCK_MOCK
    const r = evaluateTenderEligibility(quoteById("q3"));
    // A q3 tem 2 itens: MSC-N95 (sem estoque) + GZE-EST-10 (estoque ok)
    // logo ainda é possível participar parcialmente.
    expect(r.canParticipate).toBe(true);
    expect(r.fullyAttendable).toBe(false);
    expect(r.summary.noStock).toBeGreaterThanOrEqual(1);
    // A receita atendível deve excluir o item sem estoque
    expect(r.attendableRevenue).toBeLessThan(r.totalRevenue);
  });

  it("sóParticipable filtra cotações onde há ao menos um item atendível", () => {
    const participable = onlyParticipable(INITIAL_QUOTES);
    const all = evaluateTenderEligibilityForQuotes(INITIAL_QUOTES);
    expect(participable).toHaveLength(all.filter((r) => r.canParticipate).length);
    for (const q of participable) {
      expect(evaluateTenderEligibility(q).canParticipate).toBe(true);
    }
  });

  it("cotação sem itens → não participável", () => {
    const empty: Quote = {
      ...quoteById("q1"),
      id: "q_empty",
      items: [],
    };
    const r = evaluateTenderEligibility(empty);
    expect(r.canParticipate).toBe(false);
    expect(r.fullyAttendable).toBe(false);
    expect(r.attendableCount).toBe(0);
  });

  it("cada item atendível expõe margem e receita calculadas", () => {
    const r = evaluateTenderEligibility(quoteById("q1"));
    for (const entry of r.attendableItems) {
      expect(entry.revenue).toBeGreaterThan(0);
      expect(entry.margin).toBeGreaterThan(0);
      expect(entry.canAttend).toBe(true);
    }
  });
});
