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
- [x] Commit da Melhoria #4 (ce7a17c)

## Passo 6 — Melhoria #6 (Bridge ERP Offline via CSV)
- [x] Implementar `csv-bridge.ts` (import/export, parse, templates Protheus/Sankhya/Use/Genérico)
- [x] Implementar `csv-bridge.test.ts` (10 testes) + refinamentos pós-commit (parser numérico BR/decimal)
- [x] Criar `csv-import-dialog.tsx` (dialog de importação/exportação)
- [x] Seção "Bridge ERP (CSV)" + `handleCsvImport` em `integracoes.tsx`
- [x] Label `csv_imported` em `auditoria.tsx` + ícone em `quote-timeline.tsx`
- [x] Commit da Melhoria #6 (a8f71a2)

## Passo 7 — Melhoria #1 (Notificações SLA reais)
- [x] Criar `src/lib/medical/push-notifications.ts` — Push API subscription + alerta sonoro (Web Audio)
- [x] Criar `src/hooks/use-sla-title-badge.ts` — badge de contagem no title/favicon
- [x] Integrar Push + som em `use-sla-notifications.tsx`
- [x] Badge de contagem + toggle de som em `sla-alert-bell.tsx`
- [x] Verificação: tsc (0 erros), vitest (148/148), eslint (arquivos novos limpos; 1127 erros prettier pré-existentes no restante do código, não relacionados)
- [x] Docs atualizados: TODO.md, PLANO-MELHORIAS.md, TASK-retomada-melhoria1.md
- [ ] Commit da Melhoria #1 + refinamentos #6

## Passo 8 — Melhoria #7 (Retorno do ERP — fechar o ciclo do CSV bridge)
- [x] `csv-bridge.ts`: `parseCsvReturn()` (SKU → custo, estoque, status) + `applyReturnToQuote()`
- [x] `csv-bridge.test.ts`: testes de retorno (17 testes no total)
- [x] `csv-import-dialog.tsx`: nova aba "Retorno do ERP" + prop `onApplyReturn`
- [x] `integracoes.tsx`: `handleCsvApplyReturn` + `onApplyReturn` conectado ao dialog
- [x] Verificação: tsc (0 erros), vitest (155/155)
- [x] Docs atualizados: TODO.md, PLANO-MELHORIAS.md, TASK-melhoria7.md
- [ ] Commit da Melhoria #7

