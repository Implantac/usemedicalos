import { describe, it, expect, beforeEach } from "vitest";
import { runRetentionJob } from "./retention";
import { setTenantConfig, resetTenantConfig } from "./tenant-config";
import { localStorageRepo } from "./repo/local-storage";
import { TENANTS } from "./mock-data";
import type { Quote } from "./types";

// Usamos o próprio localStorageRepo (que já tem fallback in-memory p/ Node)
// como camada de persistência nos testes. `retention.ts` compartilha o
// mesmo QUOTES_KEY, então lê/escreve consistente.

async function seed(quotes: Quote[]) {
  // Reset e semeia via API pública do repo.
  // Purga tudo primeiro:
  const existing = await localStorageRepo.quotes.listByTenant("all");
  for (const q of existing) await localStorageRepo.quotes.remove(q.id);
  // Escreve direto no storage compartilhado:
  const store = typeof window !== "undefined" ? window.localStorage : null;
  if (store) store.setItem("use-medical:quotes:v2", JSON.stringify(quotes));
}
import { TENANTS } from "./mock-data";
import type { Quote } from "./types";

const KEY = "use-medical:quotes:v2";

function mkQuote(tenantId: string, status: Quote["status"], ageDays: number, id: string): Quote {
  const receivedAt = new Date(Date.now() - ageDays * 86_400_000).toISOString();
  return {
    id,
    tenant_id: tenantId,
    owner_id: "u_ana",
    source_type: "email",
    status,
    priority: "normal",
    customer_name: "Hosp X",
    customer_segment: "hospital",
    received_at: receivedAt,
    sla_deadline: new Date().toISOString(),
    original_payload: "",
    keywords: [],
    items: [],
  };
}

describe("retention job", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();
    }
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
