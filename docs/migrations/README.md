# USE Medical — Migrations

Ordem de execução recomendada ao ativar Lovable Cloud. Cada arquivo é
idempotente onde faz sentido (usa `if not exists` / `create or replace`).

| # | Arquivo | Descrição |
|---|---------|-----------|
| 1 | `../supabase-schema.md` (bloco SQL) | Base: tenants, roles, products, quotes, quote_items, sla_tracking, commissions, compliance, benchmarks, api_keys, erp_mappings, inbox_views |
| 2 | `commissions_trigger.sql` | Cálculo server-side de margem + comissão via trigger |
| 3 | `inbox_views.sql` | Índices auxiliares para filtros da inbox |
| 4 | `audit_chain.sql` | Activity log imutável com hash-chain (djb2) |
| 5 | `ingestion_engine.sql` | `ingest_log`, `quarantine_payloads`, `rate_limits` |
| 6 | `pricing_engine.sql` | Colunas de governança em `products` + view gestor-only |
| 7 | `governance.sql` | Overrides granulares de permissão por usuário |
| 8 | `tenant_config.sql` | Overrides de margem/comissão por tenant |

## Pré-requisitos

- Tipos e funções (`app_role`, `is_tenant_member`, `has_role`) já
  criados no passo 1.
- `pgcrypto` habilitado (`create extension if not exists "pgcrypto"`).

## Depois de rodar

1. Seed do tenant piloto + `tenant_members(auth.uid(), role='admin')`.
2. Trocar hooks localStorage por `createServerFn` + TanStack Query
   (mapeamento em `src/lib/medical/*` — cada hook lista as tabelas que
   toca).
3. Rotar segredos: `WEBHOOK_SECRET`, `INGEST_HMAC_SECRET`,
   `USE_SISTEMAS_HMAC_SECRET`.
4. Rodar suite de testes (`bunx vitest run`) contra o novo backend em
   staging antes do cutover.
