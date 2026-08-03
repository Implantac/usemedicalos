# Plano de Melhorias Operacionais — USE Medical

Com base na análise completa do código-fonte, manifesto do produto e roadmap, proponho

## 1. 🚨 Notificações SLA Reais (Push + WhatsApp)

**Problema:** O SLA watchdog monitora prazos atrasados (`use-sla-notifications.tsx`), mas a notificação é apenas via `Notification API` do navegador. Não há fallback para quando o usuário está com a aba fechada ou no celular.

**O que já existe:**
- `src/hooks/use-sla-notifications.tsx` — notificação browser com `Notification` API
- `src/lib/medical/outbound-webhooks.ts` — push para Slack/Teams/WhatsApp
- `src/components/medical/sla-indicator.tsx` — indicador visual de SLA
- `src/components/medical/sla-watchdog.tsx` (rota) — painel de monitoramento

**O que implementar:**
- **Service Worker + Push API:** registrar SW que recebe push mesmo com aba fechada (`/public/sw.js`)
- **Notificação por som:** alerta sonoro quando chega cotação urgente ou SLA crítico
- **Integração WhatsApp Business:** ativar o conector `comm-whatsapp` do marketplace (já está em beta, `requires_cloud: true`)
- **Webhook de disparo server-side:** migrar o `fireOverdue()` de `outbound-webhooks.ts` para uma server function agendada (quando Cloud ativo)
- **Badge de notificação no header:** contador de cotações em risco no favicon/title

**Arquivos a criar/modificar:**
- `public/sw.js` — novo (Service Worker)
- `src/hooks/use-sla-notifications.tsx` — adicionar Push API subscription
- `src/components/medical/app-header.tsx` — badge de notificação
- `src/lib/medical/outbound-webhooks.ts` — melhorar `fireOverdue` com debounce e dedup
- `src/routes/sla-watchdog.tsx` — configurar canal WhatsApp

---

## 2. 🔄 Sincronização Multi-usuário (Supabase)

**Problema:** Tudo está em `localStorage` — `useQuotes`, `useActivities`, `useTenderParticipation`, etc. Um distribuidor com múltiplos vendedores não pode compartilhar dados.

**O que já existe:**
- Schema Supabase completo em `docs/supabase-schema.md` (tabelas: `quotes`, `quote_items`, `products`, `activity_log`, `commissions`, `tenant_members`, `user_roles`, `api_keys`, `erp_mappings`, `inbox_views`)
- Hooks com `// TODO(cloud): migrar para tabela...` em todos os lugares
- `src/lib/medical/repo/` — camada de abstração de dados (index.ts, local-storage.ts, supabase.stub.ts, types.ts)
- `src/lib/medical/repo/repo.test.ts` — testes da camada de repositório

**O que implementar:**
- **Camada `supabase.ts` real no repo:** implementar `SupabaseRepository` usando `createServerFn` + TanStack Query
- **Middleware de autenticação:** `requireSupabaseAuth` para proteger server functions
- **Migração gradual:** hook por hook, substituir `localStorage.getItem` por query TanStack Query
- **Ordem de migração:** `useQuotes` → `useActivities` → `useTenderParticipation` → `useTenantConfig` → `useErpMappings` → `useApiKeys` → `useInboxViews`
- **Seed data:** script para popular tenant piloto + usuário admin + produtos mock

**Arquivos a criar/modificar:**
- `src/lib/medical/repo/supabase.ts` — novo (implementação real Supabase)
- `src/lib/medical/repo/index.ts` — adicionar `SupabaseRepository`
- `src/lib/medical/repo/supabase.stub.ts` — manter como fallback dev
- `src/hooks/use-quotes.tsx` — migrar para TanStack Query
- `src/hooks/use-active-tenant.tsx` — migrar
- `src/hooks/use-repo.tsx` — novo hook de contexto do repositório
- `src/server.ts` — adicionar server functions

---

## 3. ⚡ Cadastro Rápido de Produto Inline (Quick Product) ✅ IMPLEMENTADO

**Problema:** Quando `product-matching.ts` retorna `not_found`, o vendedor não tem como cadastrar o produto rapidamente. Ele precisa sair do fluxo, ir em "Produtos", criar, e voltar.

**O que já existe:**
- `src/lib/medical/product-matching.ts` — `classifyItem()` retorna `classification: "not_found"` quando não encontra SKU
- `src/components/medical/quote-drawer.tsx` — drawer lateral com edição de itens
- `src/lib/medical/mock-data.ts` — `PRODUCTS` array mock
- `src/routes/produtos.tsx` — rota de gerenciamento de produtos

**O que implementar:**
- **Modal "Cadastrar Produto" inline:** ao clicar em item `not_found` no drawer, abrir modal mínimo com campos: SKU, nome, custo, unidade
- **Ação:** criar produto no catálogo, reclassificar o item automaticamente, e aplicar preço sugerido
- **Feedback visual:** o item passa de "não localizado" para "atendível" instantaneamente
- **Log de atividade:** `appendActivity` com tipo `product_quick_created`

**Arquivos a criar/modificar:**
- `src/components/medical/quick-product-dialog.tsx` — novo (modal de cadastro rápido)
- `src/components/medical/quote-drawer.tsx` — adicionar botão "Cadastrar" em itens `not_found`
- `src/hooks/use-products.tsx` — novo hook ou adicionar `addProduct` ao existente
- `src/lib/medical/product-matching.ts` — função `addProductToCatalog()`

---

## 4. 📋 Versionamento de Cotação Pré-Envio (Snapshot)

**Problema:** Não há histórico do estado completo dos itens antes do envio. Se o vendedor altera preços depois, não dá para saber o que foi enviado originalmente.

**O que já existe:**
- `src/lib/medical/activity.ts` — `appendActivity()` com hash-chain (imutabilidade auditável)
- `src/lib/medical/audit-chain.ts` — `GENESIS_HASH`, `hashActivity()`
- `src/components/medical/quote-timeline.tsx` — timeline de atividades
- `src/lib/medical/product-history.ts` — histórico de preços por produto

**O que implementar:**
- **Snapshot automático no envio:** ao clicar "Gerar Proposta & Enviar", capturar snapshot completo dos itens (SKU, quantidade, preço, margem)
- **Tipo de atividade `snapshot_sent`:** novo tipo em `ActivityType` com payload completo
- **Comparação visual:** no timeline, mostrar diff entre "versão enviada" e "versão atual" (destaque em verde/vermelho)
- **Reverter para versão enviada:** botão "Restaurar preços do envio" no drawer

**Arquivos a criar/modificar:**
- `src/lib/medical/snapshot.ts` — novo (captura/compare/restore)
- `src/lib/medical/activity.ts` — adicionar tipo `snapshot_sent` e `quote_restored` + metadata
- `src/components/medical/version-diff.tsx` — novo (componente de diff visual)
- `src/components/medical/quote-drawer.tsx` — capturar snapshot antes de enviar, handler de restauração
- `src/components/medical/quote-timeline.tsx` — renderizar diff + botão restaurar
- `src/routes/auditoria.tsx` — labels para os novos tipos

**Status: ✅ Implementado** (testes 138/138, tsc limpo, eslint 0 erros)

---

## 5. 📊 Painel Individual do Vendedor (Gamificação) ✅ IMPLEMENTADO

**Problema:** A rota `vendedor.$ownerId.tsx` já existe e mostra KPIs, comissão estimada e comparativo de mercado, mas não tem gamificação (metas, ranking, notificações de conquista).

**O que já existe:**
- `src/routes/vendedor.$ownerId.tsx` — painel completo com KPI cards, DailyGoalRing, leaderboard, RegionBenchmarkCard
- `src/components/medical/kpi-card.tsx` — componente de card de KPI
- `src/components/medical/daily-goal-ring.tsx` — anel de progresso da meta diária
- `src/components/medical/leaderboard-table.tsx` — tabela de ranking de vendedores
- `src/lib/medical/analytics.ts` — `computeKpis()`, `leaderboard()`, `dailySeries()`
- `src/lib/medical/commission.ts` — `summarizeForOwner()`, `computeCommission()`

**O que implementar:**
- **Metas configuráveis por vendedor:** ao invés de `dailyGoal = 1500` hardcoded, ler de configuração (tenant config ou localStorage)
- **Badges de conquista:** "Velocidade" (respondeu em <1h), "Precisão" (margem >20%), "Consistência" (5 dias seguidos batendo meta)
- **Notificação de meta batida:** toast + som quando atinge 100% da meta diária
- **Histórico de performance:** gráfico de 30 dias (já existe `dailySeries()` em analytics.ts)
- **Comparação com pares:** "Você está em #3 no ranking de comissão este mês"

**Arquivos a criar/modificar:**
- `src/lib/medical/achievements.ts` — novo (sistema de badges/conquistas)
- `src/components/medical/achievement-badge.tsx` — novo
- `src/routes/vendedor.$ownerId.tsx` — adicionar seção de conquistas, metas configuráveis, gráfico 30d
- `src/hooks/use-owner-goals.ts` — novo hook para metas por vendedor
- `src/lib/medical/analytics.ts` — adicionar `performanceTrend()`

---

## 6. 🔗 Bridge ERP Offline via CSV (Bidirecional)

**Problema:** Muitos distribuidores hospitalares brasileiros usam ERPs legados (Microsiga, Logix, RM) sem API REST. O conector CSV resolve o gap.

**O que já existe:**
- `src/lib/medical/erp-connectors.ts` — conectores ERP (Use Sistemas, TOTVS, Sankhya, Senior, Webhook genérico)
- `src/lib/medical/erp-mapping.ts` — `applyMapping()` com JSONPath, `SAMPLE_ERP_PAYLOAD`, `SAMPLE_MAPPING`
- `src/routes/integracoes.tsx` — sandbox de mapeamento com editor JSON
- `src/components/medical/quote-inbox.tsx` — exportação CSV já existe (botão "Exportar CSV")
- `src/lib/medical/ingestion.ts` — `buildQuoteFromPayload()`, `IngestPayload`

**O que implementar:**
- **Exportar cotações em formato ERP:** CSV com colunas que o ERP espera (cliente, SKU, qtd, preço, margem) — mapeável via template
- **Importar retorno do ERP (CSV):** upload de arquivo CSV com preço de custo atualizado, estoque, e status do pedido
- **Template de mapeamento CSV:** editor visual (não JSON) para mapear colunas do CSV do ERP
- **Presets por ERP:** templates pré-configurados para Protheus (SA1/SB1/SC5/SC6), Sankhya (Parceiro/NotaVenda)
- **Log de importação:** `appendActivity` com tipo `csv_imported`

**Arquivos a criar/modificar:**
- `src/lib/medical/csv-bridge.ts` — novo (parser/gerador CSV com mapeamento)
- `src/lib/medical/csv-bridge.test.ts` — novo
- `src/components/medical/csv-import-dialog.tsx` — novo
- `src/routes/integracoes.tsx` — adicionar seção "Bridge ERP Offline" com upload/download
- `src/hooks/use-erp-mappings.tsx` — adicionar templates CSV

---

## Prioridade Técnica Sugerida

| # | Melhoria | Esforço | Impacto | Dependências |
|---|----------|---------|---------|--------------|
| 1 | Notificações SLA | Médio | Alto | Service Worker, Push API |
| 2 | Supabase (multi-usuário) | Alto | Crítico | Lovable Cloud ativo |
| 3 | Cadastro rápido produto | Baixo | Alto | Nenhuma |
| 4 | Versionamento cotação | Médio | Médio | Activity + Audit Chain |
| 5 | Painel vendedor (gamificação) | Baixo | Alto | Nenhuma (já tem base) |
| 6 | Bridge ERP CSV | Médio | Alto | ERP Mapping existente |

**Ordem recomendada de implementação:** 3 → 5 → 4 → 6 → 1 → 2
(começar pelo que dá mais valor com menos esforço e sem dependências externas)
