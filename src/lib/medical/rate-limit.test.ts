import { describe, it, expect, beforeEach } from "vitest";
import { rateLimit, __resetRateLimit, clientKey } from "./rate-limit";

describe("rateLimit", () => {
  beforeEach(() => __resetRateLimit());

  it("permite até o limite e bloqueia o excedente", () => {
    for (let i = 0; i < 3; i++) {
      expect(rateLimit("k", { max: 3, windowMs: 1000 }).ok).toBe(true);
    }
    expect(rateLimit("k", { max: 3, windowMs: 1000 }).ok).toBe(false);
  });

  it("reseta após a janela expirar", async () => {
    expect(rateLimit("k2", { max: 1, windowMs: 20 }).ok).toBe(true);
    expect(rateLimit("k2", { max: 1, windowMs: 20 }).ok).toBe(false);
    await new Promise((r) => setTimeout(r, 30));
    expect(rateLimit("k2", { max: 1, windowMs: 20 }).ok).toBe(true);
  });

  it("clientKey usa headers de IP quando disponíveis", () => {
    const req = new Request("http://x", { headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" } });
    expect(clientKey(req, "erp")).toBe("erp:1.2.3.4");
  });
});
