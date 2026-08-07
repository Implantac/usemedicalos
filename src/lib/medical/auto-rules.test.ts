import { describe, expect, it } from "vitest";
import type { Quote } from "./types";
import {
  DEFAULT_AUTO_RULES,
  evaluateAutoRules,
  evaluateRule,
  quoteMargin,
  quoteRevenue,
  shouldAutoRespond,
  type AutoRule,
} from "./auto-rules";

function makeQuote(overrides: Partial<Quote> = {}): Quote {
  return {
    id: "q1",
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

describe("auto-rules", () => {
  it("quoteMargin and quoteRevenue compute correctly", () => {
    const quote = makeQuote();
    expect(quoteRevenue(quote.items)).toBe(1000);
    expect(quoteMargin(quote.items)).toBeCloseTo(0.4);
  });

  it("evaluateRule matches Tier A with high margin", () => {
    const rule: AutoRule = {
      id: "r1",
      name: "test",
      condition: { clientTier: "A", minMargin: 0.2 },
      action: "auto_respond",
      enabled: true,
    };
    const quote = makeQuote({ client_tier: "A" });
    const evalResult = evaluateRule(rule, quote);
    expect(evalResult.matched).toBe(true);
  });

  it("evaluateRule rejects mismatched tier", () => {
    const rule: AutoRule = {
      id: "r1",
      name: "test",
      condition: { clientTier: "A", minMargin: 0.2 },
      action: "auto_respond",
      enabled: true,
    };
    const quote = makeQuote({ client_tier: "B" });
    const evalResult = evaluateRule(rule, quote);
    expect(evalResult.matched).toBe(false);
  });

  it("shouldAutoRespond positive for Tier A high margin", () => {
    const quote = makeQuote({ client_tier: "A" });
    expect(shouldAutoRespond(DEFAULT_AUTO_RULES, quote)).toBe(true);
  });

  it("evaluateAutoRules separates elevated rules", () => {
    const quote = makeQuote({ client_tier: "B" });
    const result = evaluateAutoRules(DEFAULT_AUTO_RULES, quote);
    // Tier B não auto-responde; mas margem 40% ≥ piso → não eleva.
    expect(result.autoResponded.length).toBe(0);
    expect(result.elevated.length).toBe(0);
  });

  it("evaluateAutoRules elevates low margin quote", () => {
    const quote = makeQuote({
      items: [
        { product_id: "S1", sku: "S1", name: "Seringa", quantity: 10, unit_price: 11, cost_price: 10 },
      ],
    });
    const result = evaluateAutoRules(DEFAULT_AUTO_RULES, quote);
    expect(result.elevated.length).toBe(1);
  });

  it("disabled rule never matches", () => {
    const rule: AutoRule = {
      id: "r_off",
      name: "off",
      condition: { minMargin: 0 },
      action: "auto_respond",
      enabled: false,
    };
    const evalResult = evaluateRule(rule, makeQuote());
    expect(evalResult.matched).toBe(false);
  });
});

