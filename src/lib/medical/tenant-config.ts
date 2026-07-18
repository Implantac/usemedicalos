// Configuração de margem/target por tenant.
// Hoje: localStorage. Amanhã: coluna JSON na tabela `tenants` com RLS.
import { MIN_MARGIN } from "./types";

export interface TenantConfig {
  min_margin: number; // piso duro (bloqueia envio)
  target_margin: number; // alvo da IA de sugestão
  retention_days: number; // Data Residency: purga quotes perdidas após N dias
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  min_margin: MIN_MARGIN,
  target_margin: 0.28,
  retention_days: 90,
};

const STORAGE_KEY = "use-medical:tenant-config:v1";
const EVENT = "use-medical:tenant-config:change";

type Store = Record<string, Partial<TenantConfig>>;

function readStore(): Store {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Store;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function getTenantConfig(tenantId: string | null | undefined): TenantConfig {
  if (!tenantId) return DEFAULT_TENANT_CONFIG;
  const override = readStore()[tenantId] ?? {};
  return { ...DEFAULT_TENANT_CONFIG, ...override };
}

export function setTenantConfig(tenantId: string, patch: Partial<TenantConfig>) {
  const store = readStore();
  store[tenantId] = { ...(store[tenantId] ?? {}), ...patch };
  writeStore(store);
}

export function resetTenantConfig(tenantId: string) {
  const store = readStore();
  delete store[tenantId];
  writeStore(store);
}

export function subscribeTenantConfig(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
