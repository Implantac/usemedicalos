import { describe, it, expect, beforeEach } from "vitest";
import { runRetentionJob } from "./retention";
import { setTenantConfig, resetTenantConfig } from "./tenant-config";
import { TENANTS } from "./mock-data";
import type { Quote } from "./types";

// Node env — retention.ts + tenant-config.ts têm fallback in-memory.
// Escrevemos direto no memory Map via APIs internas: usamos setTenantConfig
// (que aceita a ausência de window) e semeamos as quotes pelo storage exposto
// indiretamente através de runRetentionJob({dryRun}) não é possível — então
// usamos localStorage mock global.

// Polyfill mínimo de localStorage para o env `node`.
if (typeof (globalThis as any).window === "undefined") {
  const mem = new Map<string, string>();
  (globalThis as any).window = {
    localStorage: {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, v),
      removeItem: (k: string) => void mem.delete(k),
      clear: () => mem.clear(),
    },
    sessionStorage: {
      getItem: (k: string) => mem.get(`sess:${k}`) ?? null,
      setItem: (k: string, v: string) => void mem.set(`sess:${k}`, v),
    },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };
}

const KEY = "use-medical:quotes:v2";

function mkQuote(tenantId: string, status: Quote["status"], ageDays: number, id: string): Quote {
  return {
    id,
    tenant_id: tenantId,
    owner_id: "u_ana",
    source_type: "email",
    status,
    priority: "normal",
    customer_name: "Hosp X",
    customer_segment: "hospital",
    received_at: new Date(Date.now() - ageDays * 86_400_000).toISOString(),
    sla_deadline: new Date().toISOString(),
    original_payload: "",
    keywords: [],
    items: [],
  };
}

describe("retention job", () => {
  beforeEach(() => {
    window.localStorage.clear?.();
    TENANTS.forEach((t) => resetTenantConfig(t.id));
  });

  it("purga apenas quotes perdidas acima de retention_days", () => {
    const t = TENANTS[0].id;
    setTenantConfig(t, { retention_days: 30 });
    window.localStorage.setItem(
      KEY,
      JSON.stringify([
        mkQuote(t, "perdido", 100, "old-lost"),
        mkQuote(t, "perdido", 5, "recent-lost"),
        mkQuote(t, "ganho", 200, "old-won"),
      ]),
    );
    const report = runRetentionJob();
    expect(report.purged).toBe(1);
    expect(report.perTenant[t].purged).toBe(1);
    const kept = JSON.parse(window.localStorage.getItem(KEY)!) as Quote[];
    expect(kept.map((q) => q.id).sort()).toEqual(["old-won", "recent-lost"]);
  });

  it("dry-run não escreve", () => {
    const t = TENANTS[0].id;
    setTenantConfig(t, { retention_days: 1 });
    window.localStorage.setItem(KEY, JSON.stringify([mkQuote(t, "perdido", 10, "x")]));
    const report = runRetentionJob({ dryRun: true });
    expect(report.purged).toBe(1);
    const kept = JSON.parse(window.localStorage.getItem(KEY)!) as Quote[];
    expect(kept).toHaveLength(1);
  });
});
