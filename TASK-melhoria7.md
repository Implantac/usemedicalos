# Melhoria #7 — Fechar o ciclo do CSV bridge (Retorno do ERP)

## Contexto
A Melhoria #6 criou o CSV bridge bidirecional, mas apenas **exporta** cotações e **importa** rascunhos. Falta processar o **retorno do ERP**: preço de custo atualizado, estoque e status do pedido — que é o que gera valor real de volta para o sistema.

## Etapas
- [x] `src/lib/medical/csv-bridge.ts`: adicionar `parseCsvReturn()` (SKU → custo, estoque, status) + `applyReturnToQuote()` (aplica devoluções a uma cotação)
- [x] `src/lib/medical/csv-bridge.test.ts`: testes unitários para `parseCsvReturn` e `applyReturnToQuote`
- [x] `src/components/medical/csv-import-dialog.tsx`: nova aba "Retorno do ERP" (upload de CSV de retorno + aplicação na cotação)
- [x] `src/routes/integracoes.tsx`: `handleCsvApplyReturn` + `onApplyReturn` conectado ao dialog
- [x] Verificação: `tsc --noEmit` (0 erros), `vitest run` (155/155), `eslint`
- [x] Atualizar docs: `TODO.md`, `PLANO-MELHORIAS.md`, `TASK-melhoria7.md`
- [ ] Commit

## Resumo
- `parseCsvReturn`: lê um CSV de retorno do ERP (SKU, custo, estoque, status do pedido) e devolve um relatório de atualizações.
- `applyReturnToQuote`: aplica as devoluções a uma cotação (atualiza custo/estoque/status) e gera atividades de auditoria.
- UI: aba "Retorno do ERP" no dialog de CSV, permitindo upload e aplicação.
