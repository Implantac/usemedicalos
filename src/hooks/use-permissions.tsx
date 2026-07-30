// Resolve as permissões do usuário ativo no tenant ativo.
// Hoje: baseado em `useUserRole` (vendedor/gestor/admin) mapeado para o primeiro
// owner do seed. Amanhã (Cloud): usar auth.uid() + tabela `memberships`.
import { useMemo } from "react";
import { useUserRole } from "./use-user-role";
import { useActiveTenant } from "./use-active-tenant";
import { useGovernance } from "./use-governance";
import {
  ROLE_DEFAULT_PERMISSIONS,
  resolvePermissions,
  type GovRole,
  type Permission,
} from "@/lib/medical/governance";
import { OWNERS } from "@/lib/medical/mock-data";

// Mapa: papel global → owner "de faz-de-conta" para casar com governança.
// Em produção isso vem do JWT.
const DEMO_OWNER_BY_ROLE: Record<string, string> = {
  admin: OWNERS[0].id,
  gestor: OWNERS[1].id,
  vendedor: OWNERS[2].id,
};

export function usePermissions() {
  const { role } = useUserRole();
  const { tenant } = useActiveTenant();
  const { memberships } = useGovernance(tenant?.id);

  const govRole = (role as GovRole) ?? "vendedor";
  const demoUserId = DEMO_OWNER_BY_ROLE[role] ?? OWNERS[0].id;

  const permissions = useMemo<Permission[]>(() => {
    const m = memberships.find((x) => x.user_id === demoUserId);
    if (m) return resolvePermissions(m);
    // fallback: se não há membership registrado, usa o padrão do papel global.
    return [...ROLE_DEFAULT_PERMISSIONS[govRole]];
  }, [memberships, demoUserId, govRole]);

  const can = (perm: Permission) => permissions.includes(perm);

  return { can, permissions, role: govRole, demoUserId };
}
