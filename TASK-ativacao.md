# Controle de Tarefas — Retomada do trabalho

## Passo 1 — Corrigir formatação prettier
- [x] Diagnóstico: 14 erros de prettier em 4 arquivos (achievements.test.ts, activity.ts, product-catalog.ts, auditoria.tsx)
- [x] Rodar `npx prettier --write` nos arquivos afetados

## Passo 2 — Re-verificar
- [x] `npx tsc --noEmit` sem erros
- [x] `npx vitest run` 133/133 passando
- [x] `npx eslint` sem erros

## Passo 3 — Atualizar docs
- [x] Marcar Melhoria #3 e #5 como implementadas em `PLANO-MELHORIAS.md`
- [x] Atualizar `TODO.md` (seção pendente)
- [x] Marcar etapas concluídas no `TODO-inline.md`

## Passo 4 — Commit
- [x] Commit das melhorias #3 e #5 (b7269b3)

## Passo 5 — Próxima melhoria
- [x] Iniciar Melhoria #4 (Versionamento de Cotação Pré-Envio)
- [x] Implementar `snapshot.ts`, `snapshot.test.ts`, `version-diff.tsx`
- [x] Integrar `snapshot_sent`/`quote_restored` em `activity.ts`, `quote-drawer.tsx`, `quote-timeline.tsx`, `auditoria.tsx`
- [x] Verificação: tsc (0), vitest (138/138), eslint (0 erros)
- [x] Docs atualizados: TODO.md, PLANO-MELHORIAS.md, TASK-melhoria4.md, TASK-ativacao.md
- [ ] Commit da Melhoria #4

