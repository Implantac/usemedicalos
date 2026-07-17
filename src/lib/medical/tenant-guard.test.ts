import { describe, expect, it } from "vitest";
import { assertSameTenant, CrossTenantWriteError, isWriteAllowed } from "./tenant-guard";

const quoteA = { id: "q1", tenant_id: "tnt_a" };
const quoteB = { id: "q2", tenant_id: "tnt_b" };

describe("tenant-guard", () => {
  it("permite escrita quando escopo bate", () => {
    expect(isWriteAllowed(quoteA, "tnt_a")).toBe(true);
  });

  it("permite escrita quando escopo é 'all' (superadmin)", () => {
    expect(isWriteAllowed(quoteA, "all")).toBe(true);
    expect(isWriteAllowed(quoteB, "all")).toBe(true);
  });

  it("bloqueia escrita cross-tenant", () => {
    expect(isWriteAllowed(quoteA, "tnt_b")).toBe(false);
  });

  it("assertSameTenant lança CrossTenantWriteError com contexto", () => {
    try {
      assertSameTenant(quoteA, "tnt_b");
      throw new Error("deveria ter lançado");
    } catch (err) {
      expect(err).toBeInstanceOf(CrossTenantWriteError);
      const e = err as CrossTenantWriteError;
      expect(e.attemptedTenant).toBe("tnt_a");
      expect(e.activeScope).toBe("tnt_b");
      expect(e.quoteId).toBe("q1");
    }
  });

  it("não lança quando escopo bate", () => {
    expect(() => assertSameTenant(quoteA, "tnt_a")).not.toThrow();
    expect(() => assertSameTenant(quoteB, "all")).not.toThrow();
  });
});
