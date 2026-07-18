/**
 * LocalStorage implementation — espelha exatamente a lógica dos hooks
 * atuais (`use-quotes`, `use-inbox-views`) mas atrás das interfaces do
 * repository pattern. Ao ativar o Cloud, basta trocar por `supabase.ts`.
 */

import type { Product, Quote, QuoteStatus, ClientTier } from "@/lib/medical/types";
import { INITIAL_QUOTES, PRODUCTS, TENANTS } from "@/lib/medical/mock-data";
import { classify, slaHoursFor } from "@/lib/medical/classifier";
import type {
  InboxView,
  InboxViewsRepo,
  NewQuoteInput,
  ProductRepo,
  QuoteRepo,
  Repo,
  TenantRepo,
} from "./types";

const QUOTES_KEY = "use-medical:quotes:v2";
const VIEWS_KEY = "use-medical:inbox-views:v1";
const PRODUCTS_KEY = "use-medical:products:v1";

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as T;
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(key, JSON.stringify(value));
}

// --------- Quotes ---------
const quotesRepo: QuoteRepo = {
  async listByTenant(tenantId) {
    const all = readJson<Quote[]>(QUOTES_KEY, INITIAL_QUOTES);
    return tenantId === "all" ? all : all.filter((q) => q.tenant_id === tenantId);
  },
  async getById(id) {
    const all = readJson<Quote[]>(QUOTES_KEY, INITIAL_QUOTES);
    return all.find((q) => q.id === id) ?? null;
  },
  async create(input: NewQuoteInput) {
    const cls = classify(input.original_payload);
    const priority = input.priority_override ?? cls.priority;
    const sla = slaHoursFor(priority);
    const now = new Date();
    const q: Quote = {
      id: `q${Date.now().toString().slice(-6)}`,
      tenant_id: input.tenant_id,
      owner_id: input.owner_id,
      source_type: input.source_type,
      status: "aguardando_precificacao",
      priority,
      customer_name: input.customer_name,
      customer_segment: input.customer_segment,
      received_at: now.toISOString(),
      sla_deadline: new Date(now.getTime() + sla * 3_600_000).toISOString(),
      original_payload: input.original_payload,
      keywords: cls.keywords,
      items: input.items,
      notes: "",
      use_sistemas_synced: false,
    };
    const all = readJson<Quote[]>(QUOTES_KEY, INITIAL_QUOTES);
    writeJson(QUOTES_KEY, [q, ...all]);
    return q;
  },
  async update(id, patch) {
    const all = readJson<Quote[]>(QUOTES_KEY, INITIAL_QUOTES);
    const next = all.map((q) => (q.id === id ? { ...q, ...patch } : q));
    writeJson(QUOTES_KEY, next);
    const updated = next.find((q) => q.id === id);
    if (!updated) throw new Error(`Quote ${id} não encontrada`);
    return updated;
  },
  async setStatus(id, status: QuoteStatus) {
    return this.update(id, { status });
  },
  async setTier(id, tier: ClientTier) {
    return this.update(id, { client_tier: tier });
  },
  async remove(id) {
    const all = readJson<Quote[]>(QUOTES_KEY, INITIAL_QUOTES);
    writeJson(QUOTES_KEY, all.filter((q) => q.id !== id));
  },
};

// --------- Products ---------
const productsRepo: ProductRepo = {
  async listByTenant(_tenantId) {
    // Mock: catálogo é global. Cloud terá tenant_id por linha.
    return readJson<Product[]>(PRODUCTS_KEY, PRODUCTS);
  },
  async getById(id) {
    const all = readJson<Product[]>(PRODUCTS_KEY, PRODUCTS);
    return all.find((p) => p.id === id) ?? null;
  },
  async update(id, patch) {
    const all = readJson<Product[]>(PRODUCTS_KEY, PRODUCTS);
    const next = all.map((p) => (p.id === id ? { ...p, ...patch } : p));
    writeJson(PRODUCTS_KEY, next);
    const updated = next.find((p) => p.id === id);
    if (!updated) throw new Error(`Produto ${id} não encontrado`);
    return updated;
  },
};

// --------- Tenants ---------
const tenantsRepo: TenantRepo = {
  async list() {
    return TENANTS;
  },
  async getById(id) {
    return TENANTS.find((t) => t.id === id) ?? null;
  },
};

// --------- Inbox Views ---------
const inboxViewsRepo: InboxViewsRepo = {
  async list() {
    return readJson<InboxView[]>(VIEWS_KEY, []);
  },
  async upsert({ name, state }) {
    const all = readJson<InboxView[]>(VIEWS_KEY, []);
    const existing = all.find((v) => v.name === name);
    if (existing) {
      const updated = { ...existing, state };
      writeJson(VIEWS_KEY, all.map((v) => (v.id === existing.id ? updated : v)));
      return updated;
    }
    const created: InboxView = {
      id: `iv_${Date.now().toString(36)}`,
      name,
      state,
      created_at: new Date().toISOString(),
    };
    writeJson(VIEWS_KEY, [created, ...all]);
    return created;
  },
  async remove(id) {
    const all = readJson<InboxView[]>(VIEWS_KEY, []);
    writeJson(VIEWS_KEY, all.filter((v) => v.id !== id));
  },
};

export const localStorageRepo: Repo = {
  backend: "local",
  quotes: quotesRepo,
  products: productsRepo,
  tenants: tenantsRepo,
  inboxViews: inboxViewsRepo,
};
