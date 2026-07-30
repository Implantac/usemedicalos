/**
 * STUB — versão sincronizada com Lovable Cloud do useInboxViews.
 *
 * Este arquivo NÃO é usado atualmente. É o esqueleto pronto para plugar
 * assim que o Lovable Cloud + auth forem ativados no workspace.
 *
 * Passos para ativar:
 *   1. Rodar a migration em `docs/migrations/inbox_views.sql`.
 *   2. Adicionar login (e-mail + Google) via Cloud Auth.
 *   3. Renomear este arquivo para `use-inbox-views.tsx` (substituindo o atual).
 *   4. Registrar `attachSupabaseAuth` em `src/start.ts`.
 *
 * Estratégia:
 *   - Usuário logado → CRUD via server functions com RLS por auth.uid().
 *   - Usuário anônimo → fallback localStorage (idêntico ao hook atual).
 *   - Ao logar pela 1ª vez, faz merge one-shot das visualizações locais
 *     no servidor (upsert por nome) e limpa o localStorage.
 */

// ============================================================================
// PSEUDOCÓDIGO — descomente e ajuste após ativar o Cloud
// ============================================================================
//
// import { createServerFn } from "@tanstack/react-start";
// import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
// import { z } from "zod";
//
// export const listInboxViews = createServerFn({ method: "GET" })
//   .middleware([requireSupabaseAuth])
//   .handler(async ({ context }) => {
//     const { data, error } = await context.supabase
//       .from("inbox_views")
//       .select("id, name, state, created_at")
//       .order("created_at", { ascending: false });
//     if (error) throw error;
//     return data;
//   });
//
// export const upsertInboxView = createServerFn({ method: "POST" })
//   .middleware([requireSupabaseAuth])
//   .inputValidator((i) => z.object({ name: z.string().min(1).max(120), state: z.record(z.any()) }).parse(i))
//   .handler(async ({ data, context }) => {
//     const { data: row, error } = await context.supabase
//       .from("inbox_views")
//       .upsert({ user_id: context.userId, name: data.name, state: data.state }, { onConflict: "user_id,name" })
//       .select("id, name, state, created_at")
//       .single();
//     if (error) throw error;
//     return row;
//   });
//
// export const deleteInboxView = createServerFn({ method: "POST" })
//   .middleware([requireSupabaseAuth])
//   .inputValidator((i) => z.object({ id: z.string().uuid() }).parse(i))
//   .handler(async ({ data, context }) => {
//     const { error } = await context.supabase
//       .from("inbox_views").delete().eq("id", data.id).eq("user_id", context.userId);
//     if (error) throw error;
//     return { ok: true };
//   });
//
// Hook: use TanStack Query com queryKey ["inbox-views", userId ?? "anon"];
// no branch anônimo, reutilize a implementação atual (localStorage).
//
// Merge one-shot ao logar:
//   const local = JSON.parse(localStorage.getItem("use-medical:inbox-views:v1") ?? "[]");
//   await Promise.all(local.map((v) => upsertInboxView({ data: { name: v.name, state: v.state } })));
//   localStorage.removeItem("use-medical:inbox-views:v1");
