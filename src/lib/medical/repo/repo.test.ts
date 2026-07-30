import { beforeEach, describe, expect, it } from "vitest";
import { localStorageRepo } from "./local-storage";
import { supabaseRepo } from "./supabase.stub";
import { getRepo, setRepoOverride } from "./index";
import { TENANTS } from "@/lib/medical/mock-data";

describe("repo/local-storage", () => {
  beforeEach(() => {
    if (typeof window !== "undefined") window.localStorage.clear();
  });

  it("cria e lista quotes por tenant", async () => {
    const q = await localStorageRepo.quotes.create({
      tenant_id: TENANTS[0].id,
      owner_id: "u_ana",
      customer_name: "Hospital Teste",
      customer_segment: "hospital",
      source_type: "email",
      original_payload: "cotacao urgente",
      items: [],
    });
    const list = await localStorageRepo.quotes.listByTenant(TENANTS[0].id);
    expect(list.some((x) => x.id === q.id)).toBe(true);
    const other = await localStorageRepo.quotes.listByTenant(TENANTS[1].id);
    expect(other.some((x) => x.id === q.id)).toBe(false);
  });

  it("upsert de inbox view respeita nome único", async () => {
    const a = await localStorageRepo.inboxViews.upsert({ name: "SLA Alto", state: { f: 1 } });
    const b = await localStorageRepo.inboxViews.upsert({ name: "SLA Alto", state: { f: 2 } });
    expect(b.id).toBe(a.id);
    const list = await localStorageRepo.inboxViews.list();
    expect(list.filter((v) => v.name === "SLA Alto")).toHaveLength(1);
    expect(list.find((v) => v.id === a.id)?.state).toEqual({ f: 2 });
  });
});

describe("repo/supabase.stub", () => {
  it("lança NotImplementedError em todos os métodos", async () => {
    await expect(supabaseRepo.quotes.listByTenant("x")).rejects.toThrow(/pendente/);
    await expect(supabaseRepo.products.listByTenant("x")).rejects.toThrow(/pendente/);
    await expect(supabaseRepo.tenants.list()).rejects.toThrow(/pendente/);
    await expect(supabaseRepo.inboxViews.list()).rejects.toThrow(/pendente/);
  });
});

describe("repo/factory", () => {
  it("respeita override em testes", () => {
    setRepoOverride(supabaseRepo);
    expect(getRepo().backend).toBe("cloud");
    setRepoOverride(null);
    expect(getRepo().backend).toBe("local");
  });
});
