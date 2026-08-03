# Plano de Melhorias — USE Medical

## Implementado

### 1. Ecossistema na Interface (Fase 3 — UI)
- [x] **PartnerTag** em badges.tsx — selo visual para Bionexo/Apoio/Marketplace via `origin_partner_id`
- [x] **PartnerTag** na quote-inbox (modo detalhado) + coluna `partner` no CSV
- [x] **PartnerTag** no quote-drawer (cabeçalho)
- [x] **PartnerTag** no tender-board (painel de licitações)
- [x] **Fallback dev HMAC** — secret determinístico quando env var não configurada
- [x] **Simulador de Ecossistema** (simulator.ts) — gera payloads, assina, chama endpoint, cria Quote local
- [x] Card "Simulador de Ecossistema" em integracoes.tsx
- [x] Testes: 127/127 passando, tsc limpo, build ok

### 2. ⚡ Cadastro Rápido de Produto Inline (Melhoria #3)
- [x] **`product-catalog.ts`** — catálogo mutável em runtime (PRODUCTS + localStorage)
- [x] **`quick-product-dialog.tsx`** — Dialog minimalista: SKU, Nome, Custo, Unidade
- [x] **`activity.ts`** — novo tipo `product_quick_created`
- [x] **`quote-drawer.tsx`** — botão "Cadastrar" quando `catalogProduct === null`; ao criar, aplica custo + preço sugerido no item
- [x] **`quote-timeline.tsx`** + **`auditoria.tsx`** — ícone e label para o novo tipo de atividade
- [x] Testes: 127/127 passando (sem regressão)
- [x] TypeScript: sem erros

### 3. 📊 Painel do vendedor (gamificação) — Melhoria #5
- [x] **`achievements.ts`** — sistema de conquistas (velocidade, precisão, consistência, foguete, foco, resiliência)
- [x] **`achievements.test.ts`** — testes unitários das conquistas
- [x] **`analytics.ts`** — `performanceTrend()` (comissão/ganho por dia)
- [x] **`use-owner-goals.ts`** — meta diária configurável por vendedor (localStorage)
- [x] **`achievement-badge.tsx`** — badge de conquista com progresso
- [x] **`performance-chart.tsx`** — gráfico de performance 30 dias (sem dependências extras)
- [x] **`vendedor.$ownerId.tsx`** — integração: hero comissão, meta configurável, ranking, conquistas, benchmark, gráfico 30d
- [x] Testes: 133/133 passando, tsc limpo, eslint limpo

## Pendente (próximas melhorias)

### 4. 📋 Versionamento de cotação pré-envio — Melhoria #4
- Snapshot do estado antes de enviar, diff visual

### 5. 🔗 Bridge ERP offline via CSV — Melhoria #6
- Importar/exportar cotações em CSV para ERP sem API

### 6. 🚨 Notificações SLA reais (Push + WhatsApp) — Melhoria #1
- Notificações nativas, push, WhatsApp

### 7. 🔄 Sincronização multi-usuário (Supabase) — Melhoria #2
- Migração Lovable Cloud + queries reais

