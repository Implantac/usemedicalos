/**
 * STUB — implementação Supabase do repository pattern.
 *
 * Ainda não plugada: todos os métodos lançam `NotImplementedError`.
 * Quando `VITE_USE_CLOUD=true` e o Lovable Cloud estiver ativo, substitua
 * cada throw pela chamada correspondente via `createServerFn` +
 * `requireSupabaseAuth`.
 *
 * Mapeamento pronto:
 *   quotes.*        → server fns em `src/lib/medical/repo/quotes.functions.ts`
 *   products.*      → server fns em `src/lib/medical/repo/products.functions.ts`
 *   tenants.*       → server fns em `src/lib/medical/repo/tenants.functions.ts`
 *   inboxViews.*    → ver `src/hooks/use-inbox-views.cloud.stub.tsx`
 *
 * Todas as tabelas já têm RLS por `tenant_id` no
 * `docs/supabase-schema.md` + migrations em `docs/migrations/`.
 */

import type { Repo } from "./types";

class NotImplementedError extends Error {
  constructor(method: string) {
    super(`[supabaseRepo] ${method} — pendente. Rode migrations e conecte createServerFn.`);
    this.name = "NotImplementedError";
  }
}

function notImpl(name: string): never {
  throw new NotImplementedError(name);
}

export const supabaseRepo: Repo = {
  backend: "cloud",
  quotes: {
    listByTenant: async () => notImpl("quotes.listByTenant"),
    getById: async () => notImpl("quotes.getById"),
    create: async () => notImpl("quotes.create"),
    update: async () => notImpl("quotes.update"),
    setStatus: async () => notImpl("quotes.setStatus"),
    setTier: async () => notImpl("quotes.setTier"),
    remove: async () => notImpl("quotes.remove"),
  },
  products: {
    listByTenant: async () => notImpl("products.listByTenant"),
    getById: async () => notImpl("products.getById"),
    update: async () => notImpl("products.update"),
  },
  tenants: {
    list: async () => notImpl("tenants.list"),
    getById: async () => notImpl("tenants.getById"),
  },
  inboxViews: {
    list: async () => notImpl("inboxViews.list"),
    upsert: async () => notImpl("inboxViews.upsert"),
    remove: async () => notImpl("inboxViews.remove"),
  },
};
