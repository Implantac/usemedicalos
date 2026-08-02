# Plano — Incremento: Ecossistema na Interface

## Contexto
- Fase 3 (Ecosystem API + Bionexo + origin_partner_id) está commitada e verificada (117 testes, build ok).
- A camada de backend do ecossistema está completa, mas a interface ainda não expõe `origin_partner_id`
  e não há um sandbox dev utilizável (sem env vars, o HMAC falha e não há simulador de marketplace).

## Etapas

### 1. Selo de origem parceira na UI
- [x] Criar `PartnerTag` em `src/components/medical/badges.tsx` (exibe Bionexo/Apoio/Marketplace via `origin_partner_id`)
- [x] Exibir `PartnerTag` na linha da cotação em `src/components/medical/quote-inbox.tsx` (modo detalhada)
- [x] Exibir `PartnerTag` no cabeçalho do `src/components/medical/quote-drawer.tsx`
- [x] Adicionar coluna `partner` no CSV export da inbox

### 2. Fallback dev-friendly para HMAC
- [x] `src/lib/medical/ecosystem/partners.ts`: fallback para secret determinístico de dev quando env não configurado
- [x] Ajustar `src/lib/medical/ecosystem/partners.test.ts` e `api.test.ts` para cobrir fallback dev

### 3. Simulador de Marketplace
- [x] Criar `src/lib/medical/ecosystem/simulator.ts` (gera payloads, assina, chama `/api/public/ecosystem/quotes`, cria Quote local via `ingestPortalQuote`)
- [x] Criar `src/lib/medical/ecosystem/simulator.test.ts`
- [x] Adicionar card "Simulador de Ecossistema" em `src/routes/integracoes.tsx`

### 4. Exposição no Painel de Licitações
- [x] Exibir `PartnerTag` em `src/components/medical/tender-board.tsx`

## Verificação final (pós-prettier)
- [x] `vitest run` passando — **127/127** (31 arquivos; inclui 22 novos testes de ecossistema: partners 7, api 7, simulator 8)
- [x] `tsc --noEmit` sem erros
- [x] `eslint` sem erros nos arquivos alterados (0 errors, apenas 3 warnings preexistentes)
- [x] `vite build` completo ok
- [x] Atualizar `docs/roadmap/fase-3.md`

