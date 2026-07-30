// Governança: papéis e permissões por tenant (multi-tenant).
// Hoje: localStorage. Amanhã: tabelas `memberships` + `role_permissions` no Supabase.
// Modelo: cada usuário (OWNERS) recebe um papel dentro de cada tenant.
// Permissões são derivadas do papel, com overrides ponto-a-ponto opcionais.

import { OWNERS, TENANTS } from "./mock-data";

export type GovRole = "viewer" | "vendedor" | "gestor" | "admin";

export const ROLE_LABEL: Record<GovRole, string> = {
  viewer: "Viewer",
  vendedor: "Vendedor",
  gestor: "Gestor",
  admin: "Admin",
};

export const ROLE_DESCRIPTION: Record<GovRole, string> = {
  viewer: "Somente leitura da Inbox e relatórios do tenant.",
  vendedor: "Opera cotações, responde propostas, respeita piso de margem.",
  gestor: "Aprova overrides de compliance/margem e configura tenant.",
  admin: "Governança total: papéis, integrações e chaves API.",
};

// ————————————————————————————————————————————————————————————————
// Catálogo de permissões (chaves estáveis — reflete o que o app faz hoje)
// ————————————————————————————————————————————————————————————————

export type Permission =
  | "quotes.view"
  | "quotes.respond"
  | "quotes.override_margin"
  | "compliance.override"
  | "pricing.governance"
  | "integrations.manage"
  | "api_keys.manage"
  | "tenant.configure"
  | "governance.manage";

export interface PermissionMeta {
  key: Permission;
  label: string;
  group: "Comercial" | "Compliance" | "Precificação" | "Integrações" | "Administração";
  description: string;
}

export const PERMISSIONS: PermissionMeta[] = [
  { key: "quotes.view", group: "Comercial", label: "Ver Inbox de cotações", description: "Visualizar cotações do tenant." },
  { key: "quotes.respond", group: "Comercial", label: "Responder cotações", description: "Enviar propostas e mover o pipeline." },
  { key: "quotes.override_margin", group: "Comercial", label: "Sobrescrever margem", description: "Fechar abaixo do piso comercial (registrado no timeline)." },
  { key: "compliance.override", group: "Compliance", label: "Override de compliance", description: "Liberar itens ANVISA/CMED em exceção (auditado)." },
  { key: "pricing.governance", group: "Precificação", label: "Governança de produto", description: "Editar teto CMED, market_avg e flags regulatórias." },
  { key: "integrations.manage", group: "Integrações", label: "Gerenciar integrações ERP/Portal", description: "Configurar mapeamentos, webhooks e portais." },
  { key: "api_keys.manage", group: "Integrações", label: "Gerenciar API Keys", description: "Emitir/revogar chaves de ingestão." },
  { key: "tenant.configure", group: "Administração", label: "Configurar tenant", description: "Ajustar min_margin e target_margin do tenant." },
  { key: "governance.manage", group: "Administração", label: "Gerenciar papéis", description: "Atribuir papéis e permissões por tenant." },
];

// Matriz padrão de papéis (pode ser sobrescrita por membership)
export const ROLE_DEFAULT_PERMISSIONS: Record<GovRole, Permission[]> = {
  viewer: ["quotes.view"],
  vendedor: ["quotes.view", "quotes.respond"],
  gestor: [
    "quotes.view",
    "quotes.respond",
    "quotes.override_margin",
    "compliance.override",
    "pricing.governance",
    "tenant.configure",
  ],
  admin: PERMISSIONS.map((p) => p.key),
};

// ————————————————————————————————————————————————————————————————
// Storage
// ————————————————————————————————————————————————————————————————

export interface Membership {
  tenant_id: string;
  user_id: string;
  role: GovRole;
  // permissões manualmente concedidas ou removidas por cima do papel
  grants?: Permission[];
  revokes?: Permission[];
  updated_at: string;
}

const STORAGE_KEY = "use-medical:governance:v1";
const EVENT = "use-medical:governance:change";

type Store = { memberships: Membership[] };

function seed(): Store {
  // Seed determinístico: 1º owner = admin do tenant primário; demais = vendedor no seu tenant regional.
  const now = new Date().toISOString();
  const mems: Membership[] = [];
  TENANTS.forEach((t, ti) => {
    OWNERS.forEach((o, oi) => {
      const role: GovRole =
        ti === 0 && oi === 0
          ? "admin"
          : oi === 0
            ? "gestor"
            : oi === 1
              ? "gestor"
              : "vendedor";
      mems.push({ tenant_id: t.id, user_id: o.id, role, updated_at: now });
    });
  });
  return { memberships: mems };
}

function read(): Store {
  if (typeof window === "undefined") return seed();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const s = seed();
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
      return s;
    }
    return JSON.parse(raw) as Store;
  } catch {
    return seed();
  }
}

function write(store: Store) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function listMemberships(tenantId?: string): Membership[] {
  const all = read().memberships;
  return tenantId ? all.filter((m) => m.tenant_id === tenantId) : all;
}

export function getMembership(tenantId: string, userId: string): Membership | undefined {
  return read().memberships.find((m) => m.tenant_id === tenantId && m.user_id === userId);
}

export function setRole(tenantId: string, userId: string, role: GovRole) {
  const store = read();
  const now = new Date().toISOString();
  const idx = store.memberships.findIndex((m) => m.tenant_id === tenantId && m.user_id === userId);
  if (idx >= 0) {
    store.memberships[idx] = { ...store.memberships[idx], role, updated_at: now };
  } else {
    store.memberships.push({ tenant_id: tenantId, user_id: userId, role, updated_at: now });
  }
  write(store);
}

export function togglePermissionOverride(
  tenantId: string,
  userId: string,
  perm: Permission,
  next: boolean,
) {
  const store = read();
  const idx = store.memberships.findIndex((m) => m.tenant_id === tenantId && m.user_id === userId);
  if (idx < 0) return;
  const m = { ...store.memberships[idx] };
  const defaults = ROLE_DEFAULT_PERMISSIONS[m.role];
  const inDefault = defaults.includes(perm);
  m.grants = (m.grants ?? []).filter((p) => p !== perm);
  m.revokes = (m.revokes ?? []).filter((p) => p !== perm);
  if (next && !inDefault) m.grants = [...(m.grants ?? []), perm];
  if (!next && inDefault) m.revokes = [...(m.revokes ?? []), perm];
  m.updated_at = new Date().toISOString();
  store.memberships[idx] = m;
  write(store);
}

export function removeMembership(tenantId: string, userId: string) {
  const store = read();
  store.memberships = store.memberships.filter(
    (m) => !(m.tenant_id === tenantId && m.user_id === userId),
  );
  write(store);
}

export function resolvePermissions(m: Membership | undefined): Permission[] {
  if (!m) return [];
  const base = new Set(ROLE_DEFAULT_PERMISSIONS[m.role]);
  (m.revokes ?? []).forEach((p) => base.delete(p));
  (m.grants ?? []).forEach((p) => base.add(p));
  return Array.from(base);
}

export function hasPermission(
  tenantId: string,
  userId: string,
  perm: Permission,
): boolean {
  return resolvePermissions(getMembership(tenantId, userId)).includes(perm);
}

export function subscribeGovernance(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

export function resetGovernance() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new CustomEvent(EVENT));
}
