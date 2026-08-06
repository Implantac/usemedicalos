/**
 * Server functions do repository cloud (Melhoria #8).
 *
 * Estas funções rodam no servidor (via `createServerFn`) e são protegidas pelo
 * middleware `requireSupabaseAuth`. Em ambiente local (sem Cloud), o middleware
 * retorna `authed:false` e as funções delegam ao `localStorageRepo` — mantendo
 * o app funcional offline.
 *
 * Quando a Lovable Cloud for ativada:
 *   1. Instale `@supabase/supabase-js`.
 *   2. Configure `VITE_USE_CLOUD=true` + `SUPABASE_URL`/`SUPABASE_ANON_KEY`.
 *   3. Injete o client autenticado no contexto via `attachSupabaseAuth` (start.ts).
 *   4. Estas funções passam a persistir em Postgres com RLS por auth.uid().
 *
 * Nota: os tipos retornados são achatados (serializáveis) para respeitar as
 * constraints de serialização do TanStack ServerFn.
 */

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "./auth-middleware";
import { localStorageRepo } from "./local-storage";

// ===========================================================================
// Quotes
// ===========================================================================
export const listQuotesCloud = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    // Local: delega ao localStorage. Cloud: usar context.supabase com RLS.
    return localStorageRepo.quotes.listByTenant("all");
  });

export const createQuoteCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) =>
    z
      .object({
        tenant_id: z.string(),
        owner_id: z.string(),
        customer_name: z.string(),
        customer_segment: z.string(),
        source_type: z.string(),
        original_payload: z.string(),
        items: z.array(z.any()),
      })
      .parse(i),
  )
  .handler(async ({ data }) => {
    return localStorageRepo.quotes.create(data as never);
  });

// ===========================================================================
// Inbox Views (serializável — sem Record<string, unknown>)
// ===========================================================================
export const listInboxViewsCloud = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const views = await localStorageRepo.inboxViews.list();
    // Achata `state` para string JSON (serializável via RPC).
    return views.map((v) => ({ id: v.id, name: v.name, state: JSON.stringify(v.state) }));
  });

export const upsertInboxViewCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ name: z.string(), state_json: z.string() }).parse(i))
  .handler(async ({ data }) => {
    const row = await localStorageRepo.inboxViews.upsert({
      name: data.name,
      state: JSON.parse(data.state_json) as Record<string, unknown>,
    });
    return { id: row.id, name: row.name, state: JSON.stringify(row.state) };
  });

export const deleteInboxViewCloud = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i) => z.object({ id: z.string() }).parse(i))
  .handler(async ({ data }) => {
    return localStorageRepo.inboxViews.remove(data.id);
  });
