import { useEffect, useState } from "react";
import {
  createApiKey,
  deleteApiKey,
  listApiKeys,
  revokeApiKey,
  type ApiKey,
  type ApiScope,
  type RateTier,
} from "@/lib/medical/api-keys";

export function useApiKeys(tenantId: string) {
  const [keys, setKeys] = useState<ApiKey[]>([]);

  useEffect(() => {
    setKeys(listApiKeys(tenantId));
  }, [tenantId]);

  function refresh() {
    setKeys(listApiKeys(tenantId));
  }

  return {
    keys,
    create(input: { label: string; scopes: ApiScope[]; tier?: RateTier }) {
      const k = createApiKey({ tenantId, ...input });
      refresh();
      return k;
    },
    revoke(id: string) {
      revokeApiKey(id);
      refresh();
    },
    remove(id: string) {
      deleteApiKey(id);
      refresh();
    },
  };
}
