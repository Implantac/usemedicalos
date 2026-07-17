import { useCallback, useEffect, useState } from "react";
import { TENANTS, tenantById } from "@/lib/medical/mock-data";
import type { Tenant } from "@/lib/medical/types";

const STORAGE_KEY = "use-medical:active-tenant";
const EVENT = "use-medical:active-tenant:change";

export type ActiveTenantScope = string | "all";

function read(): ActiveTenantScope {
  if (typeof window === "undefined") return TENANTS[0].id;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return TENANTS[0].id;
    if (raw === "all") return "all";
    return TENANTS.some((t) => t.id === raw) ? raw : TENANTS[0].id;
  } catch {
    return TENANTS[0].id;
  }
}

export function useActiveTenant() {
  const [scope, setScope] = useState<ActiveTenantScope>(TENANTS[0].id);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setScope(read());
    setHydrated(true);
    const handler = (e: Event) => {
      const next = (e as CustomEvent<ActiveTenantScope>).detail;
      setScope(next);
    };
    window.addEventListener(EVENT, handler as EventListener);
    return () => window.removeEventListener(EVENT, handler as EventListener);
  }, []);

  const setActiveTenant = useCallback((next: ActiveTenantScope) => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_KEY, next);
    window.dispatchEvent(new CustomEvent(EVENT, { detail: next }));
    setScope(next);
  }, []);

  const tenant: Tenant | null = scope === "all" ? null : tenantById(scope);

  return { scope, tenant, tenants: TENANTS, hydrated, setActiveTenant };
}
