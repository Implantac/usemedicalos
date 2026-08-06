/**
 * useRepo — context provider da camada de repositório (Melhoria #8).
 *
 * Expõe o backend ativo (localStorage ou Cloud) de forma reativa. Hooks de
 * dados (useQuotes, useInboxViews, etc.) consomem `useRepo()` para acessar as
 * interfaces `quotes`/`products`/`tenants`/`inboxViews` sem conhecer o backend.
 *
 * Decisão de backend:
 *  - `VITE_USE_CLOUD=true` + `SUPABASE_URL`/`SUPABASE_ANON_KEY` → Cloud
 *    (quando o client estiver disponível em runtime; senão cai no local).
 *  - caso contrário → localStorage.
 *
 * Também permite `setCloudEnabled(bool)` para cutover em runtime (útil em
 * preview/testes sem derrubar a sessão).
 */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { cloudRepo } from "@/lib/medical/repo/cloud";
import { localStorageRepo } from "@/lib/medical/repo/local-storage";
import type { Backend, Repo } from "@/lib/medical/repo/types";
import { cloudAvailable } from "@/lib/medical/repo/cloud";

interface RepoContextValue {
  /** backend ativo */
  backend: Backend;
  /** repositório ativo (mesma interface do repository pattern) */
  repo: Repo;
  /** force Cloud (ignora cloudAvailable) — útil para cutover/testes */
  setCloudEnabled: (enabled: boolean) => void;
  /** true quando o Cloud está disponível (env + client) */
  cloudSupported: boolean;
}

const RepoContext = createContext<RepoContextValue | null>(null);

export function RepoProvider({ children }: { children: ReactNode }) {
  const [forceCloud, setForceCloud] = useState(false);

  const cloudSupported = cloudAvailable();

  const backend: Backend = forceCloud && cloudSupported ? "cloud" : "local";
  const repo = forceCloud && cloudSupported ? cloudRepo : localStorageRepo;

  const setCloudEnabled = useCallback((enabled: boolean) => setForceCloud(enabled), []);

  const value = useMemo<RepoContextValue>(
    () => ({ backend, repo, setCloudEnabled, cloudSupported }),
    [backend, repo, setCloudEnabled, cloudSupported],
  );

  return <RepoContext.Provider value={value}>{children}</RepoContext.Provider>;
}

export function useRepo(): RepoContextValue {
  const ctx = useContext(RepoContext);
  if (!ctx) {
    // Fallback seguro fora do provider (não derruba a árvore).
    return {
      backend: "local",
      repo: localStorageRepo,
      setCloudEnabled: () => {},
      cloudSupported: false,
    };
  }
  return ctx;
}
