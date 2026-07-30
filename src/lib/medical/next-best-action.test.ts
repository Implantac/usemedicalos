import { describe, expect, it } from "vitest";
import { computeNextBestActions, totalAtStake } from "./next-best-action";
import type { Quote } from "./types";

function makeQuote(over: Partial<Quote>): Quote {
  const base = {
    id: "q1",
    tenant_id: "t1",
    owner_id: "u1",
    customer_name: "Hospital Alfa",
    customer_segment: "hospital",
    source_type: "email",
    status: "aguardando_precificacao",
    priority: "normal",
    client_tier: "B",
    received_at: new Date().toISOString(),
    sla_deadline: new Date(Date.now() + 6 * 3600_000).toISOString(),
    original_payload: "",
    items: [
      { product_id: "p1", sku: "LV-1", name: "Luva", quantity: 100, cost_price: 10, unit_price: 14 },
    ],
  } as unknown as Quote;
  return { ...base, ...over } as Quote;
}

describe("next-best-action", () => {
  it("prioriza margem crítica sobre cotação saudável", () => {
    const healthy = makeQuote({ id: "ok" });
    const thin = makeQuote({
      id: "thin",
      items: [
        { product_id: "p1", sku: "LV-1", name: "Luva", quantity: 100, cost_price: 10, unit_price: 10.3 },
      ] as Quote["items"],
    });
    const actions = computeNextBestActions([healthy, thin]);
    expect(actions.find((a) => a.quote.id === "thin")?.kind).toBe("revisar_margem");
  });

  it("ignora cotações fechadas", () => {
    const won = makeQuote({ id: "won", status: "ganho" as Quote["status"] });
    expect(computeNextBestActions([won])).toHaveLength(0);
  });

  it("soma o valor em jogo", () => {
    const actions = computeNextBestActions([makeQuote({})]);
    expect(totalAtStake(actions)).toBeGreaterThan(0);
  });
});
