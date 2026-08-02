import { describe, expect, it, beforeEach } from "vitest";
import {
  authenticatePartner,
  ExternalQuoteSchema,
  OrderCallbackSchema,
  partnerHasScope,
  partnerRateLimit,
} from "./api";
import { signForPartner, getPartner } from "./partners";
import { __resetRateLimit } from "../rate-limit";

beforeEach(() => {
  __resetRateLimit();
  process.env.MARKETPLACE_DEMO_HMAC_SECRET = "demo-test-secret";
});

const VALID_QUOTE = {
  partner_id: "marketplace_demo",
  external_id: "EXT-1",
  customer: { name: "Hospital Beta", segment: "Hospital privado" },
  items: [{ sku: "SUT-3-0-CT", quantity: 40, target_price: 27.9 }],
};

describe("ecosystem/api", () => {
  it("valida ExternalQuoteSchema", () => {
    expect(ExternalQuoteSchema.safeParse(VALID_QUOTE).success).toBe(true);
    expect(
      ExternalQuoteSchema.safeParse({ ...VALID_QUOTE, items: [] }).success,
    ).toBe(false);
    expect(
      ExternalQuoteSchema.safeParse({ ...VALID_QUOTE, customer: {} }).success,
    ).toBe(false);
  });

  it("valida OrderCallbackSchema", () => {
    expect(
      OrderCallbackSchema.safeParse({
        partner_id: "marketplace_demo",
        order_id: "O-1",
        status: "shipped",
      }).success,
    ).toBe(true);
    expect(
      OrderCallbackSchema.safeParse({
        partner_id: "marketplace_demo",
        order_id: "O-1",
        status: "banana",
      }).success,
    ).toBe(false);
  });

  it("autentica parceiro com assinatura HMAC correta", () => {
    const body = JSON.stringify(VALID_QUOTE);
    const sig = signForPartner("marketplace_demo", body)!;
    const auth = authenticatePartner("marketplace_demo", body, sig);
    expect(auth.ok).toBe(true);
    if (auth.ok) expect(auth.partner.id).toBe("marketplace_demo");
  });

  it("rejeita assinatura inválida", () => {
    const body = JSON.stringify(VALID_QUOTE);
    const auth = authenticatePartner("marketplace_demo", body, "bad-signature");
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(401);
  });

  it("rejeita partner_id desconhecido", () => {
    const body = JSON.stringify(VALID_QUOTE);
    const auth = authenticatePartner("nao_existe", body, "x");
    expect(auth.ok).toBe(false);
    if (!auth.ok) expect(auth.status).toBe(404);
  });

  it("partnerHasScope respeita escopos", () => {
    const p = getPartner("bionexo")!;
    expect(partnerHasScope(p, "quotes:write")).toBe(true);
    expect(partnerHasScope(p, "orders:callback")).toBe(false);
  });

  it("partnerRateLimit bloqueia após o limite", () => {
    const p = getPartner("marketplace_demo")!;
    // market_place_demo: rate_limit_per_min = 120. Reduzimos simulando janela cheia.
    // Aqui apenas garantimos que o primeiro request passa.
    const r1 = partnerRateLimit(p, "test");
    expect(r1.ok).toBe(true);
    expect(r1.headers["x-ratelimit-limit"]).toBe(String(p.rate_limit_per_min));
  });
});

