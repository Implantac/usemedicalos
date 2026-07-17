import { beforeEach, describe, expect, it } from "vitest";
import {
  addOverride,
  hasOverride,
  listOverrides,
  revokeOverride,
} from "./compliance-override";

// Minimal in-memory localStorage shim for node test env.
class MemStorage {
  private m = new Map<string, string>();
  getItem(k: string) { return this.m.get(k) ?? null; }
  setItem(k: string, v: string) { this.m.set(k, String(v)); }
  removeItem(k: string) { this.m.delete(k); }
  clear() { this.m.clear(); }
}
(globalThis as unknown as { window?: unknown; localStorage?: unknown }).window = globalThis;
(globalThis as unknown as { localStorage: MemStorage }).localStorage = new MemStorage();

beforeEach(() => {
  localStorage.clear();
});

describe("compliance-override", () => {
  it("stores and reads active overrides", () => {
    addOverride({ quote_id: "q1", sku: "SKU-A", manager_id: "u_ana", reason: "cliente estratégico" });
    expect(hasOverride("q1", "SKU-A")).toBe(true);
    expect(listOverrides("q1")).toHaveLength(1);
  });

  it("revokes overrides", () => {
    addOverride({ quote_id: "q1", sku: "SKU-A", manager_id: "u_ana", reason: "x" });
    revokeOverride("q1", "SKU-A");
    expect(hasOverride("q1", "SKU-A")).toBe(false);
  });

  it("expires overrides after ttl", () => {
    addOverride({ quote_id: "q1", sku: "SKU-A", manager_id: "u_ana", reason: "x", ttl_hours: -1 });
    expect(hasOverride("q1", "SKU-A")).toBe(false);
  });

  it("dedupes same quote+sku", () => {
    addOverride({ quote_id: "q1", sku: "SKU-A", manager_id: "u_ana", reason: "1" });
    addOverride({ quote_id: "q1", sku: "SKU-A", manager_id: "u_bruno", reason: "2" });
    const list = listOverrides("q1");
    expect(list).toHaveLength(1);
    expect(list[0].manager_id).toBe("u_bruno");
  });
});
