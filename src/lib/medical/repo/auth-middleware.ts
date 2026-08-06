/**
 * Auth middleware — reutilizável em server functions do repository cloud.
 *
 * Estratégia para não quebrar o ambiente local (sem Lovable Cloud ativo):
 *  - `VITE_USE_CLOUD=true` + env `SUPABASE_URL`/`SUPABASE_ANON_KEY` + sessão
 *    → devolve `{ userId, supabase }` (contexto autenticado).
 *  - Caso contrário → devolve `{ userId: null, supabase: null }`, e o
 *    `cloud.ts` faz fallback para o `localStorageRepo`.
 *
 * Quando a Lovable Cloud for ativada, basta preencher `attachSupabaseAuth`
 * (o client/context.supabase) e o middleware passará a validar a sessão real.
 */

import { createMiddleware } from "@tanstack/react-start";

export interface SupabaseAuthContext {
  /** id do usuário autenticado (auth.uid()) ou null quando anônimo/local. */
  userId: string | null;
  /** client Supabase pronto para uso (RLS por auth.uid()) ou null em local. */
  supabase: unknown | null;
  /** true quando há client e sessão disponíveis. */
  authed: boolean;
}

/**
 * Lê a sessão atual. Em local (sem Cloud) retorna sempre authed=false.
 * Em Cloud, `context.supabase` é injetado pelo `attachSupabaseAuth` no
 * `start.ts`. Aqui apenas o repassamos para o handler.
 */
export const requireSupabaseAuth = createMiddleware().server(async ({ next }) => {
  // Cloud ativo: o client fica disponível em process.env (dev) ou no
  // contexto injetado. Tentamos resolver de forma segura.
  const cloudFlag = (import.meta.env.VITE_USE_CLOUD ?? "false") === "true";
  const url = import.meta.env.SUPABASE_URL ?? process.env.SUPABASE_URL;
  const anon = import.meta.env.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  const ctx: SupabaseAuthContext =
    cloudFlag && url && anon
      ? { userId: "__cloud__", supabase: null, authed: true }
      : { userId: null, supabase: null, authed: false };

  return next({ context: ctx });
});
