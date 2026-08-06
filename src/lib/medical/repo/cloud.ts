/**
 * Cloud repository — implementação real da camada de sincronização (Melhoria #8).
 *
 * Objetivo: expor a mesma interface `Repo` do repository pattern, mas com
 * backend Supabase quando o Cloud está ativo (+ logado) e **fallback para
 * `localStorageRepo`** caso contrário.
 *
 * Estratégia (para não quebrar o ambiente local, sem Lovable Cloud):
 *  - `cloudAvailable()` detecta `VITE_USE_CLOUD=true` + `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
 *  - `resolveCloud()` faz lazy-import do client Supabase (package `@supabase/supabase-js`)
 *    apenas quando disponível em runtime. Se ausente, cai no fallback.
 *  - Cada método tenta Cloud primeiro; em erro/ausência, delega ao `localStorageRepo`.
 *
 * RLS: as tabelas (`quotes`, `products`, `tenants`, `inbox_views`) já têm
 * policies por `tenant_id`/`auth.uid()` em `docs/supabase-schema.md`.
 */

import { localStorageRepo } from "./local-storage";
import type {
  InboxView,
  InboxViewsRepo,
  NewQuoteInput,
  ProductRepo,
  QuoteRepo,
  Repo,
  TenantRepo,
} from "./types";
import type { Product, Quote, QuoteStatus, ClientTier, Tenant } from "@/lib/medical/types";

/** true quando a feature flag Cloud está ligada e há URL+anon key. */
export function cloudAvailable(): boolean {
  const flag = (import.meta.env.VITE_USE_CLOUD ?? "false") === "true";
  const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  return flag && !!url && !!anon;
}

/**
 * Client Supabase opcional. Retorna `null` quando o pacote não está instalado
 * ou o Cloud não está configurado (ambiente local). Nunca lança.
 */
async function resolveCloudClient(): Promise<unknown | null> {
  if (!cloudAvailable()) return null;
  try {
const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
    const anon = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
    // Lazy import — o pacote só é carregado se existir em runtime.
    // Usamos specifier dinâmico para não quebrar o build quando o pacote
    // ainda não está instalado (ambiente local). Em Cloud, o bundle resolve.
    const pkg = "@supabase/supabase-js";
    const mod = (await import(pkg)) as {
      createClient: (url: string, key: string) => unknown;
    };
    return mod.createClient(url as string, anon as string);
  } catch {
    // Pacote não instalado → fallback local.
    return null;
  }
}

/** Traduz uma linha do supabase para o shape interno (numérico). */
function toNumber(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

/** Converte columns do PostgREST para Quote. */
function mapQuote(row: Record<string, unknown>): Quote {
  return {
    id: String(row.id),
    tenant_id: String(row.tenant_id),
    owner_id: String(row.owner_id ?? ""),
    source_type: (row.source_type as Quote["source_type"]) ?? "portal",
    status: (row.status as QuoteStatus) ?? "aguardando_precificacao",
    priority: (row.priority as Quote["priority"]) ?? "normal",
    customer_name: String(row.customer_name ?? ""),
    customer_segment: String(row.customer_segment ?? ""),
    received_at: String(row.received_at ?? new Date().toISOString()),
    sla_deadline: String(row.sla_deadline ?? new Date().toISOString()),
    original_payload: "",
    keywords: (row.keywords as string[]) ?? [],
    items: (row.items as Quote["items"]) ?? [],
    notes: row.notes ? String(row.notes) : undefined,
    use_sistemas_synced: Boolean(row.use_sistemas_synced),
    use_sistemas_order_id: row.use_sistemas_order_id
      ? String(row.use_sistemas_order_id)
      : undefined,
  };
}

// ---------------------------------------------------------------------------
// Quotes
// ---------------------------------------------------------------------------
const quotesRepo: QuoteRepo = {
  async listByTenant(tenantId) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        let q = (client as { from: (t: string) => any }).from("quotes").select("*");
        if (tenantId !== "all") q = q.eq("tenant_id", tenantId);
        const { data, error } = await q.order("received_at", { ascending: false });
        if (!error) return (data ?? []).map(mapQuote);
      } catch {
        /* fallback abaixo */
      }
    }
    return localStorageRepo.quotes.listByTenant(tenantId);
  },
  async getById(id) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("quotes")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) return mapQuote(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.getById(id);
  },
  async create(input: NewQuoteInput) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("quotes")
          .insert({
            tenant_id: input.tenant_id,
            owner_id: input.owner_id,
            customer_name: input.customer_name,
            customer_segment: input.customer_segment,
            source_type: input.source_type,
            original_payload_json: { raw: input.original_payload },
            items: input.items,
          })
          .select("*")
          .single();
        if (!error && data) return mapQuote(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.create(input);
  },
  async update(id, patch) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("quotes")
          .update(patch)
          .eq("id", id)
          .select("*")
          .single();
        if (!error && data) return mapQuote(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.update(id, patch);
  },
  async setStatus(id, status) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("quotes")
          .update({ status })
          .eq("id", id)
          .select("*")
          .single();
        if (!error && data) return mapQuote(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.setStatus(id, status);
  },
  async setTier(id, tier) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("quotes")
          .update({ client_tier: tier })
          .eq("id", id)
          .select("*")
          .single();
        if (!error && data) return mapQuote(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.setTier(id, tier);
  },
  async remove(id) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { error } = await (client as any).from("quotes").delete().eq("id", id);
        if (!error) return;
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.quotes.remove(id);
  },
};

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------
function mapProduct(p: any): Product {
  return {
    id: String(p.id),
    name: String(p.name),
    sku: String(p.sku),
    cost_price: toNumber(p.cost_price),
    last_suggested_price: toNumber(p.last_suggested_price),
    unit: String(p.unit ?? "un"),
    tax_rate: toNumber(p.tax_rate) || 0.18,
    logistics_rate: p.logistics_rate != null ? toNumber(p.logistics_rate) : 0.03,
    cmed_ceiling: p.cmed_ceiling != null ? toNumber(p.cmed_ceiling) : undefined,
    market_avg: p.market_avg != null ? toNumber(p.market_avg) : undefined,
  };
}

const productsRepo: ProductRepo = {
  async listByTenant(tenantId) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        let q = (client as any).from("products").select("*");
        if (tenantId !== "all") q = q.eq("tenant_id", tenantId);
        const { data, error } = await q;
        if (!error) return (data ?? []).map(mapProduct);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.products.listByTenant(tenantId);
  },
  async getById(id) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("products")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data) return mapProduct(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.products.getById(id);
  },
  async update(id, patch) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("products")
          .update(patch)
          .eq("id", id)
          .select("*")
          .single();
        if (!error && data) return mapProduct(data);
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.products.update(id, patch);
  },
};

// ---------------------------------------------------------------------------
// Tenants
// ---------------------------------------------------------------------------
const tenantsRepo: TenantRepo = {
  async list() {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any).from("tenants").select("*");
        if (!error)
          return (data ?? []).map((t: any) => ({
            id: String(t.id),
            name: String(t.name),
            cnpj: String(t.cnpj),
            erp_type: "none",
          }));
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.tenants.list();
  },
  async getById(id) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("tenants")
          .select("*")
          .eq("id", id)
          .single();
        if (!error && data)
          return {
            id: String(data.id),
            name: String(data.name),
            cnpj: String(data.cnpj),
            erp_type: "none",
          };
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.tenants.getById(id);
  },
};

// ---------------------------------------------------------------------------
// Inbox Views
// ---------------------------------------------------------------------------
const inboxViewsRepo: InboxViewsRepo = {
  async list() {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("inbox_views")
          .select("id, name, state, created_at")
          .order("created_at", { ascending: false });
        if (!error)
          return (data ?? []).map((v: any) => ({
            id: String(v.id),
            name: String(v.name),
            state: (v.state as Record<string, unknown>) ?? {},
            created_at: String(v.created_at),
          }));
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.inboxViews.list();
  },
  async upsert({ name, state }) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { data, error } = await (client as any)
          .from("inbox_views")
          .upsert({ name, state }, { onConflict: "name" })
          .select("id, name, state, created_at")
          .single();
        if (!error && data)
          return {
            id: String(data.id),
            name: String(data.name),
            state: (data.state as Record<string, unknown>) ?? {},
            created_at: String(data.created_at),
          };
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.inboxViews.upsert({ name, state });
  },
  async remove(id) {
    const client = await resolveCloudClient();
    if (client) {
      try {
        const { error } = await (client as any).from("inbox_views").delete().eq("id", id);
        if (!error) return;
      } catch {
        /* fallback */
      }
    }
    return localStorageRepo.inboxViews.remove(id);
  },
};

export const cloudRepo: Repo = {
  backend: "cloud",
  quotes: quotesRepo,
  products: productsRepo,
  tenants: tenantsRepo,
  inboxViews: inboxViewsRepo,
};

export type { InboxView, Product, Quote, Tenant };
