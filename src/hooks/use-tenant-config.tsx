import { useEffect, useState, useCallback } from "react";
import {
  DEFAULT_TENANT_CONFIG,
  getTenantConfig,
  resetTenantConfig,
  setTenantConfig,
  subscribeTenantConfig,
  type TenantConfig,
} from "@/lib/medical/tenant-config";

export function useTenantConfig(tenantId: string | null | undefined) {
  const [config, setConfig] = useState<TenantConfig>(DEFAULT_TENANT_CONFIG);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setConfig(getTenantConfig(tenantId));
    setHydrated(true);
    return subscribeTenantConfig(() => setConfig(getTenantConfig(tenantId)));
  }, [tenantId]);

  const update = useCallback(
    (patch: Partial<TenantConfig>) => {
      if (!tenantId) return;
      setTenantConfig(tenantId, patch);
    },
    [tenantId],
  );

  const reset = useCallback(() => {
    if (!tenantId) return;
    resetTenantConfig(tenantId);
  }, [tenantId]);

  return { config, hydrated, update, reset };
}
