import { describe, expect, it } from "vitest";
import {
  buildOwnerLoad,
  buildOwnerSpecialty,
  planAutoAssignments,
  splitLargeQuote,
  suggestOwner,
} from "./orchestration";
import type { Owner, Quote, QuoteItem } from "./types";

const OWNERS: Owner[] = [
  { id: "a", name: "Ana", initials: "A", territory: "SP Capital" },
  { id: "b", name: "Bruno", initials: "B", territory: "SP Interior" },
  { id: "c", name: "Carla", initials: "C", territory: "RJ/ES" },
];

function item(id: string, price = 10, qty = 5): QuoteItem {
  return { product_id: id, sku: id, name: id, quantity: qty, unit_price: price, cost_price: price * 0.6 };
}

function q(
  id: string,
  owner: string,
  status: Quote["status"],
  overrides: Partial<Quote> = {},
): Quote {
  return {
    id,
    tenant_id: "t",
    owner_id: owner,
    source_type: "email",
    status,
    priority: "normal",
    customer_name: overrides.customer_name ?? "Hospital X",
    customer_segment: overrides.customer_segment ?? "Hospital privado",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 3600_000).toISOString(),
    original_payload: "",
    keywords: overrides.keywords ?? [],
    items: overrides.items ?? [item("p1")],
    notes: "",
    use_sistemas_synced: false,
    ...overrides,
  };
}

describe("buildOwnerSpecialty", () => {
  it("computes win_rate and strong_segments", () => {
    const quotes: Quote[] = [
      q("1", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("2", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("3", "a", "perdido", { customer_segment: "Clínica" }),
    ];
    const s = buildOwnerSpecialty(quotes, "a");
    expect(s.wins_total).toBe(2);
    expect(s.losses_total).toBe(1);
    expect(s.strong_segments).toContain("hospital privado");
  });
});

describe("buildOwnerLoad", () => {
  it("weights urgent quotes heavier", () => {
    const quotes: Quote[] = [
      q("1", "a", "aguardando_precificacao", { priority: "urgente" }),
      q("2", "a", "em_negociacao", { priority: "normal" }),
      q("3", "a", "ganho"), // closed, não conta
    ];
    const l = buildOwnerLoad(quotes, "a");
    expect(l.open_count).toBe(2);
    expect(l.pressure).toBeCloseTo(3);
  });
});

describe("suggestOwner", () => {
  it("prefers owner with strong history on same segment", () => {
    const history: Quote[] = [
      q("1", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("2", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("3", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("4", "b", "perdido", { customer_segment: "Hospital privado" }),
    ];
    const incoming = q("new", "b", "pending_review", { customer_segment: "Hospital privado" });
    const [top] = suggestOwner(incoming, history, OWNERS);
    expect(top.owner.id).toBe("a");
    expect(top.reasons.join(" ")).toMatch(/vitória/i);
  });

  it("prior wins with the same customer boost the score", () => {
    const history: Quote[] = [
      q("1", "b", "ganho", { customer_name: "Hospital Alpha" }),
      q("2", "b", "ganho", { customer_name: "Hospital Alpha" }),
    ];
    const incoming = q("new", "a", "pending_review", { customer_name: "Hospital Alpha" });
    const [top] = suggestOwner(incoming, history, OWNERS);
    expect(top.owner.id).toBe("b");
  });
});

describe("splitLargeQuote", () => {
  it("returns null for small quotes", () => {
    const small = q("small", "a", "aguardando_precificacao", {
      items: [item("p1"), item("p2")],
    });
    expect(splitLargeQuote(small, [], OWNERS)).toBeNull();
  });

  it("splits when different items favor different owners", () => {
    const history: Quote[] = [
      // Ana ganha em "Hospital privado"
      q("h1", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("h2", "a", "ganho", { customer_segment: "Hospital privado" }),
      // Bruno ganha keyword "cateter"
      q("h3", "b", "ganho", { keywords: ["cateter"] }),
      q("h4", "b", "ganho", { keywords: ["cateter"] }),
    ];
    const big = q("big", "a", "aguardando_precificacao", {
      customer_segment: "Hospital privado",
      items: [
        item("p1"), item("p2"), item("p3"),
        { ...item("cat1"), name: "cateter venoso 20g" },
        { ...item("cat2"), name: "cateter venoso 22g" },
        { ...item("cat3"), name: "cateter longo cateter" },
      ],
    });
    const split = splitLargeQuote(big, history, OWNERS);
    expect(split).not.toBeNull();
    expect(split!.slices.length).toBeGreaterThanOrEqual(2);
  });
});

describe("planAutoAssignments", () => {
  it("only reassigns when new owner is clearly better", () => {
    const history: Quote[] = [
      q("h1", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("h2", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("h3", "a", "ganho", { customer_segment: "Hospital privado" }),
      q("open", "c", "pending_review", { customer_segment: "Hospital privado" }),
    ];
    const plans = planAutoAssignments(history, OWNERS);
    expect(plans.length).toBe(1);
    expect(plans[0].to_owner).toBe("a");
    expect(plans[0].from_owner).toBe("c");
  });
});
