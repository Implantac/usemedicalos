import { describe, expect, it, beforeEach } from "vitest";
import {
  ECOSYSTEM_PARTNERS,
  getPartner,
  signForPartner,
  verifyPartnerSignature,
} from "./partners";
import { __resetRateLimit } from "../rate-limit";

// Garante que os secrets estejam disponíveis para os testes de assinatura.
beforeEach(() => {
  __resetRateLimit();
  process.env.BIONEXO_HMAC_SECRET = "bionexo-test-secret";
  process.env.MARKETPLACE_DEMO_HMAC_SECRET = "demo-test-secret";
});

describe("ecosystem/partners", () => {
  it("registra os parceiros esperados com escopos", () => {
    expect(getPartner("bionexo")).toBeDefined();
    expect(getPartner("apoio")).toBeDefined();
    expect(getPartner("marketplace_demo")).toBeDefined();
    expect(getPartner("nao_existe")).toBeUndefined();
  });

  it("bionexo tem escopos quotes:write e catalog:read", () => {
    const p = getPartner("bionexo")!;
    expect(p.scopes).toContain("quotes:write");
    expect(p.scopes).toContain("catalog:read");
    expect(p.scopes).not.toContain("orders:callback");
  });

  it("marketplace_demo tem orders:callback", () => {
    const p = getPartner("marketplace_demo")!;
    expect(p.scopes).toContain("orders:callback");
  });

  it("assina e verifica payload com o secret do parceiro", async () => {
    const body = JSON.stringify({ foo: 1 });
    const sig = signForPartner("bionexo", body);
    expect(sig).toBeTruthy();
    const partner = getPartner("bionexo")!;
    expect(verifyPartnerSignature(partner, body, sig)).toBe(true);
  });

  it("rejeita assinatura inválida / partner desconhecido", async () => {
    const body = JSON.stringify({ foo: 1 });
    const partner = getPartner("bionexo")!;
    expect(verifyPartnerSignature(partner, body, "abc123")).toBe(false);
    expect(verifyPartnerSignature(partner, body, null)).toBe(false);
    expect(signForPartner("nao_existe", body)).toBeNull();
  });
});

