/**
 * Repo factory — decide backend em tempo de build via `VITE_USE_CLOUD`.
 *
 *   VITE_USE_CLOUD=false (default) → localStorageRepo
 *   VITE_USE_CLOUD=true            → supabaseRepo (stub até Cloud ativar)
 *
 * Uso:
 *   import { getRepo } from "@/lib/medical/repo";
 *   const quotes = await getRepo().quotes.listByTenant(tenantId);
 *
 * Para preview/testes, force um backend específico via `setRepoOverride`.
 */

import { localStorageRepo } from "./local-storage";
import { cloudRepo } from "./cloud";
import type { Backend, Repo } from "./types";

export * from "./types";
export { cloudAvailable } from "./cloud";

const CLOUD_FLAG = (import.meta.env.VITE_USE_CLOUD ?? "false") === "true";

let override: Repo | null = null;

export function setRepoOverride(next: Repo | null) {
  override = next;
}

export function getRepo(): Repo {
  if (override) return override;
  // Usa o cloudRepo (que faz lazy-import do Supabase e cai no localStorage
  // quando o Cloud não está disponível). Assim o mesmo código funciona local
  // e em produção Lovable Cloud.
  return CLOUD_FLAG ? cloudRepo : localStorageRepo;
}

export function currentBackend(): Backend {
  return getRepo().backend;
}
