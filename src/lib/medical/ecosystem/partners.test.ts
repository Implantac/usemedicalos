import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ECOSYSTEM_PARTNERS,
  devPartnerSecret,
  getPartner,
  resolvePartnerSecret,
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

afterEach(() => {
  delete process.env.BIONEXO_HMAC_SECRET;
  delete process.env.MARKETPLACE_DEMO_HMAC_SECRET;
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

  it("usa env var quando configurada (produção)", () => {
    const p = getPartner("bionexo")!;
    expect(resolvePartnerSecret(p)).toBe("bionexo-test-secret");
  });

  it("devPartnerSecret gera secret determinístico por parceiro", () => {
    expect(devPartnerSecret("bionexo")).toBe("dev-bionexo-secret");
    expect(devPartnerSecret("apoio")).toBe("dev-apoio-secret");
    expect(devPartnerSecret("bionexo")).not.toBe(devPartnerSecret("apoio"));
  });
});
