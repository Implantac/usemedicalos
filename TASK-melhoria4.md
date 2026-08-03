# Melhoria #4 — Versionamento de Cotação Pré-Envio (Snapshot)

## Etapas
- [x] Criar `src/lib/medical/snapshot.ts` — captura/compare/restore
- [x] Criar `src/lib/medical/snapshot.test.ts` — testes unitários (5)
- [x] Adicionar tipos `snapshot_sent`/`quote_restored` em `activity.ts`
- [x] Criar `src/components/medical/version-diff.tsx` — diff visual
- [x] Integrar no `quote-drawer.tsx` — capturar snapshot no envio
- [x] Integrar no `quote-timeline.tsx` — exibir diff + botão restaurar
- [x] Verificação: tsc (0), vitest (138/138), eslint (0 erros)
- [x] Atualizar `TODO.md` + `PLANO-MELHORIAS.md`
- [x] Commit

## Resumo
- `snapshot.ts`: captura o estado dos itens (sku, qty, preço, custo) antes do envio.
- `snapshot.test.ts`: 5 testes — captura, diff inalterado, price/qty change, item removido, restore.
- `activity.ts`: novos tipos `snapshot_sent` e `quote_restored` + metadata `quote_snapshot`/`snapshot_diff`.
- `version-diff.tsx`: diff visual por item (verde inalterado, vermelho removido, amarelo alterado), delta de receita e botão restaurar.
- `quote-drawer.tsx`: `handleGenerateProposal` captura snapshot antes de enviar; `handleRestore` restaura preços/qtd do envio; exibe `VersionDiff` na timeline.
- `quote-timeline.tsx` + `auditoria.tsx`: ícones/labels para os novos tipos de atividade.
