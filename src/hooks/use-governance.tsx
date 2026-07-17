import { useEffect, useState, useCallback } from "react";
import {
  listMemberships,
  subscribeGovernance,
  setRole as setRoleStore,
  togglePermissionOverride as toggleOverrideStore,
  removeMembership as removeStore,
  resetGovernance,
  type GovRole,
  type Membership,
  type Permission,
} from "@/lib/medical/governance";

export function useGovernance(tenantId?: string) {
  const [memberships, setMemberships] = useState<Membership[]>([]);

  const refresh = useCallback(() => {
    setMemberships(listMemberships(tenantId));
  }, [tenantId]);

  useEffect(() => {
    refresh();
    return subscribeGovernance(refresh);
  }, [refresh]);

  return {
    memberships,
    setRole: (uid: string, role: GovRole) => tenantId && setRoleStore(tenantId, uid, role),
    toggleOverride: (uid: string, perm: Permission, next: boolean) =>
      tenantId && toggleOverrideStore(tenantId, uid, perm, next),
    remove: (uid: string) => tenantId && removeStore(tenantId, uid),
    reset: resetGovernance,
  };
}
