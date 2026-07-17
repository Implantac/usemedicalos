import { beforeEach, describe, expect, it } from "vitest";
import {
  createApiKey,
  deleteApiKey,
  keyHasScope,
  listApiKeys,
  resolveApiKey,
  revokeApiKey,
} from "./api-keys";

beforeEach(() => {
  window.localStorage.clear();
});

describe("api-keys", () => {
  it("creates and lists keys per tenant", () => {
    const a = createApiKey({ tenantId: "t1", label: "A", scopes: ["catalog:read"] });
    createApiKey({ tenantId: "t2", label: "B", scopes: ["erp:ingest"] });
    expect(listApiKeys("t1")).toHaveLength(1);
    expect(listApiKeys("t1")[0].id).toBe(a.id);
  });

  it("resolves by token only when not revoked", () => {
    const k = createApiKey({ tenantId: "t1", label: "K", scopes: ["catalog:read"] });
    expect(resolveApiKey(k.token)?.id).toBe(k.id);
    revokeApiKey(k.id);
    expect(resolveApiKey(k.token)).toBeNull();
  });

  it("checks scopes and deletes", () => {
    const k = createApiKey({ tenantId: "t1", label: "K", scopes: ["erp:ingest"] });
    expect(keyHasScope(k, "erp:ingest")).toBe(true);
    expect(keyHasScope(k, "catalog:read")).toBe(false);
    deleteApiKey(k.id);
    expect(listApiKeys("t1")).toHaveLength(0);
  });
});
