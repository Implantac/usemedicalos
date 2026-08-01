# Plano de Correção de Bugs — USE Medical

## Diagnóstico
- [x] Ler arquivos principais (rotas cotacao, componentes, lib/medical, hooks)
- [x] Verificar estrutura de rotas (routeTree.gen.ts)
- [x] Rodar `tsc --noEmit` e capturar erros reais
- [x] Rodar testes (`vitest run`) e capturar falhas
- [x] Rodar lint (`eslint .`)

## Correções
- [x] Confirmar restauração do `send-proposal-dialog.tsx` (igual ao HEAD)
- [x] Corrigir erros TS (19 erros de `item.matched` → `classification.matched`) em `send-proposal-dialog.tsx`
- [x] Corrigir 2 erros de lint (`no-explicit-any`) em `send-proposal-dialog.tsx`
- [x] Corrigir typos de português em `send-proposal-dialog.tsx`
- [x] Limpar imports/variáveis não utilizados (`quote-item-table.tsx`, `send-proposal-dialog.tsx`, `cotacao.index.tsx`)
- [x] Adicionar fallback seguro no `ProductHistoryPanel` (preço atual quando sem histórico)
- [x] Ajustar `.prettierrc` (`endOfLine: auto`) para eliminar ruído CRLF no lint
- [x] Remover `_fix_ia.py` e arquivo órfão `usemedicalos-main`

## Verificação final
- [x] `tsc --noEmit` sem erros
- [x] `vitest run` passando (95/95)
- [x] `eslint` nos 4 arquivos-chave sem erros
