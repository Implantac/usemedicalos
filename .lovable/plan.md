## Contexto

Você marcou as 4 frentes. Ativar o Lovable Cloud continua bloqueado (workspace sem créditos), então sigo agora com as 3 frentes de produto e deixo o schema pronto para migração assim que houver créditos.

## Entregas

### 1. Dashboard de SLA & Performance — `/dashboard`
Nova rota com KPIs executivos (regra 5-3-1):
- **KPIs topo**: cotações ativas, ticket médio, win rate (ganho/(ganho+perdido)), margem média, % dentro do SLA.
- **Tendências**: cotações recebidas × enviadas nos últimos 14 dias (barras), distribuição por status (donut leve), volume por canal.
- **Leaderboard**: vendedor × cotações × tempo médio de resposta × margem × conversão (mock de owners nas quotes).
- **Tabela de exceções**: cotações **vencidas** e **em risco** (SLA < 25%), ordenadas por criticidade, com clique para abrir o drawer na Inbox.
- Filtro global de período (7/30/90 dias) persistido em URL search param.

### 2. Composer de nova cotação — botão "Nova cotação" no header
Dialog em 2 passos:
1. **Captura**: origem (email/whatsapp/portal/telefone/EDI), cliente, segmento, colar payload bruto (texto do e-mail/WhatsApp). Auto-classifica prioridade + keywords + SLA em tempo real (preview do badge).
2. **Itens**: seletor de produtos do catálogo (search por nome/SKU) → adiciona linhas com custo pré-preenchido e sugestão IA aplicada; permite qty/preço; mostra margem total live.

Cria a quote via `useQuotes.addQuote` (novo método no hook) com status `aguardando_precificacao`.

### 3. Catálogo de produtos & histórico — `/produtos`
- Lista de produtos (`src/lib/medical/mock-data.ts` já tem `INITIAL_PRODUCTS`) com busca, filtro por família.
- Cada linha: SKU, nome, custo, último preço sugerido, markup atual, mini-sparkline de últimos preços (derivado das quotes existentes).
- Drawer de detalhe: histórico de preços praticados por cliente/segmento (extraído das `quotes.items`), margem média, volume total, sugestão IA para markup padrão.

### 4. Multi-tenant Cloud (pendente)
Schema `tenants`, `quotes`, `quote_items`, `products`, `sla_tracking` já modelado em `src/lib/medical/types.ts`. Assim que houver créditos:
- migration com `organization_id`, RLS via `is_org_member`, GRANTs para `authenticated`;
- server functions `list_quotes`, `create_quote`, `update_quote_item`, `send_to_totvs` sob `_authenticated/`;
- `useQuotes` troca `localStorage` por TanStack Query.

Deixo TODO comentado nos arquivos-chave para a migração ser mecânica.

## Arquitetura

```
src/routes/
  index.tsx              Inbox (existente)
  dashboard.tsx          NOVO — KPIs + leaderboard + exceções
  produtos.tsx           NOVO — catálogo + drawer de histórico
src/components/medical/
  app-header.tsx         + botão "Nova cotação" + nav (Inbox/Dashboard/Produtos)
  new-quote-dialog.tsx   NOVO — composer 2 passos
  kpi-card.tsx           NOVO — card denso reutilizável
  sla-timeline.tsx       NOVO — barras de recebidas×enviadas
  status-donut.tsx       NOVO — distribuição (CSS puro, sem libs)
  leaderboard-table.tsx  NOVO
  exceptions-table.tsx   NOVO
  product-list.tsx       NOVO
  product-history-drawer.tsx NOVO
src/lib/medical/
  types.ts               + owner_id nas quotes, tipo Owner
  mock-data.ts           + OWNERS (5 vendedores) e owner_id nas seeds
  analytics.ts           NOVO — cálculos puros (winRate, avgResponse, slaHealth, priceHistory)
src/hooks/use-quotes.tsx + addQuote(payload)
```

Sem novas dependências (donut/sparkline em SVG puro para manter bundle enxuto).

## Fora de escopo
- Envio real ao TOTVS (segue mock).
- Autenticação (depende de Cloud).
- Notificações realtime.