# Melhoria #8 — Sincronização Multi-usuário (Supabase / Cloud)

## Contexto
Tudo está em `localStorage` (useQuotes, useActivities, useTenderParticipation, etc.). Um distribuidor com vários vendedores não compartilha dados. O schema Supabase já está documentado em `docs/supabase-schema.md` com RLS por `tenant_id`. Esta melhoria deixa a arquitetura **pronta** para o Cloud: camada de repositório com server functions + client Supabase opcional e **fallback ao localStorage** quando o Cloud não está ativo/logado.

## Etapas
- [x] `src/lib/medical/repo/auth-middleware.ts` — middleware `requireSupabaseAuth` (reutilizável)
- [x] `src/lib/medical/repo/cloud.ts` — implementação real via `createServerFn` + client Supabase opcional, com fallback ao `localStorageRepo`
- [x] `src/hooks/use-repo.tsx` — context provider que seleciona backend em runtime
- [x] Integrar `use-repo` no provider raiz (`__root.tsx`)
- [x] `src/lib/medical/repo/cloud.server.ts` — server functions (quotes + inbox views)
- [x] `src/lib/medical/repo/seed.ts` — seed do tenant piloto + produtos + tenant_members
- [x] Verificação: `tsc --noEmit` (0 erros), `vitest run` (155/155)
- [ ] Atualizar docs: `TODO.md`, `PLANO-MELHORIAS.md`, `TASK-melhoria8.md`
- [ ] Commit
