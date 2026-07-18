/**
 * Repository Pattern — contratos de acesso a dados.
 *
 * Objetivo: isolar o backend (localStorage hoje, Supabase amanhã) atrás de
 * interfaces estáveis. Hooks consomem `getRepo()` e não mudam quando o
 * `VITE_USE_CLOUD` flag vira `true`.
 *
 * Todos os métodos são assíncronos por design — a impl. localStorage retorna
 * `Promise.resolve(...)` para casar com a assinatura futura do Supabase.
 */

import type { Product, Quote, QuoteItem, Tenant, ClientTier, Priority, SourceType, QuoteStatus } from "@/lib/medical/types";

export type Backend = "local" | "cloud";

export interface NewQuoteInput {
  tenant_id: string;
  owner_id: string;
  customer_name: string;
  customer_segment: string;
  source_type: SourceType;
  original_payload: string;
  items: QuoteItem[];
  priority_override?: Priority;
}

export interface QuoteRepo {
  listByTenant(tenantId: string | "all"): Promise<Quote[]>;
  getById(id: string): Promise<Quote | null>;
  create(input: NewQuoteInput): Promise<Quote>;
  update(id: string, patch: Partial<Quote>): Promise<Quote>;
  setStatus(id: string, status: QuoteStatus): Promise<Quote>;
  setTier(id: string, tier: ClientTier): Promise<Quote>;
  remove(id: string): Promise<void>;
}

export interface ProductRepo {
  listByTenant(tenantId: string | "all"): Promise<Product[]>;
  getById(id: string): Promise<Product | null>;
  update(id: string, patch: Partial<Product>): Promise<Product>;
}

export interface TenantRepo {
  list(): Promise<Tenant[]>;
  getById(id: string): Promise<Tenant | null>;
}

export interface InboxView {
  id: string;
  name: string;
  state: Record<string, unknown>;
  created_at: string;
}

export interface InboxViewsRepo {
  list(): Promise<InboxView[]>;
  upsert(input: { name: string; state: Record<string, unknown> }): Promise<InboxView>;
  remove(id: string): Promise<void>;
}

export interface Repo {
  backend: Backend;
  quotes: QuoteRepo;
  products: ProductRepo;
  tenants: TenantRepo;
  inboxViews: InboxViewsRepo;
}
