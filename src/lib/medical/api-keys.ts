// Gerenciamento de API keys por tenant (client-side, localStorage).
// Cada key possui: id, label, token (público), secret (HMAC), scopes, rate tier, createdAt, revokedAt?.
// Endpoints públicos podem validar contra estas keys via `resolveApiKey(token)`.
// Quando Cloud ativar, migrar para tabela `tenant_api_keys` com RLS.

export type ApiScope = "erp:ingest" | "catalog:read" | "orders:read";
export type RateTier = "basic" | "standard" | "pro";

export interface ApiKey {
  id: string;
  tenantId: string;
  label: string;
  token: string;
  secret: string;
  scopes: ApiScope[];
  tier: RateTier;
  createdAt: string;
  lastUsedAt?: string;
  revokedAt?: string;
}

const KEY = "use-medical:api-keys:v1";

export const TIER_LIMITS: Record<RateTier, { max: number; windowMs: number }> = {
  basic: { max: 30, windowMs: 60_000 },
  standard: { max: 120, windowMs: 60_000 },
  pro: { max: 600, windowMs: 60_000 },
};

function isBrowser() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

function readAll(): ApiKey[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ApiKey[]) : [];
  } catch {
    return [];
  }
}

function writeAll(list: ApiKey[]) {
  if (!isBrowser()) return;
  window.localStorage.setItem(KEY, JSON.stringify(list));
}

function randHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  } else {
    for (let i = 0; i < bytes; i++) arr[i] = Math.floor(Math.random() * 256);
  }
  return Array.from(arr, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function listApiKeys(tenantId?: string): ApiKey[] {
  const all = readAll();
  return tenantId ? all.filter((k) => k.tenantId === tenantId) : all;
}

export function createApiKey(input: {
  tenantId: string;
  label: string;
  scopes: ApiScope[];
  tier?: RateTier;
}): ApiKey {
  const key: ApiKey = {
    id: `key_${randHex(6)}`,
    tenantId: input.tenantId,
    label: input.label.trim() || "API key",
    token: `usek_${randHex(16)}`,
    secret: `sec_${randHex(24)}`,
    scopes: input.scopes.length > 0 ? input.scopes : ["catalog:read"],
    tier: input.tier ?? "standard",
    createdAt: new Date().toISOString(),
  };
  const all = readAll();
  all.unshift(key);
  writeAll(all);
  return key;
}

export function revokeApiKey(id: string) {
  const all = readAll();
  const idx = all.findIndex((k) => k.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], revokedAt: new Date().toISOString() };
  writeAll(all);
}

export function deleteApiKey(id: string) {
  writeAll(readAll().filter((k) => k.id !== id));
}

export function resolveApiKey(token: string | null | undefined): ApiKey | null {
  if (!token) return null;
  const found = readAll().find((k) => k.token === token && !k.revokedAt);
  return found ?? null;
}

export function touchApiKey(id: string) {
  const all = readAll();
  const idx = all.findIndex((k) => k.id === id);
  if (idx < 0) return;
  all[idx] = { ...all[idx], lastUsedAt: new Date().toISOString() };
  writeAll(all);
}

export function keyHasScope(key: ApiKey, scope: ApiScope): boolean {
  return key.scopes.includes(scope);
}
