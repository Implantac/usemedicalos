import { describe, it, expect } from "vitest";
import { signPayload, verifySignature, timingSafeEqual } from "./webhook-signature";

describe("webhook-signature", () => {
  const secret = "super-secret-tenant-token";
  const body = JSON.stringify({ hello: "world", n: 42 });

  it("assina e verifica o mesmo payload", async () => {
    const sig = await signPayload(secret, body);
    expect(sig.startsWith("sha256=")).toBe(true);
    expect(await verifySignature(secret, body, sig)).toBe(true);
  });

  it("rejeita assinatura inválida", async () => {
    const sig = await signPayload(secret, body);
    expect(await verifySignature(secret, body + "x", sig)).toBe(false);
    expect(await verifySignature("outro-secret", body, sig)).toBe(false);
    expect(await verifySignature(secret, body, null)).toBe(false);
  });

  it("timingSafeEqual detecta tamanhos diferentes", () => {
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
    expect(timingSafeEqual("abc", "abc")).toBe(true);
  });
});
