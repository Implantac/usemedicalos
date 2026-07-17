## Revisão dos Planos — USE Medical Commercial OS

Depois de mapear o estado atual (Ingestion Engine + Pricing Engine 4 camadas + Multi-tenant simulado + Compliance ANVISA/CMED + Gamificação já entregues), os próximos passos são consolidar o "Commercial OS" em três frentes: **fechar o loop ativo** (portal → resposta → aprendizado), **profissionalizar a governança** e **preparar terreno para Cloud**.

---

### Sprint A — Fechar o Loop Ativo (Portal → Resposta → Aprendizado)

Objetivo: transformar RFQs capturadas em respostas rápidas com aprendizado automático.

1. **Auto-Draft de Resposta** (`src/lib/medical/auto-draft.ts`)
   - Ao ingerir uma RFQ `pending_review`, pré-calcular preço via `pricing-engine` para cada item, atribuir tier default do cliente (histórico) e criar rascunho.
   - Botão "Aceitar rascunho" no Watchdog → move para `em_negociacao` e grava `response_at`.

2. **Histórico de Cliente → Tier Automático** (`src/lib/medical/client-intel.ts`)
   - Agregar wins/losses por `customer_name` (fuzzy match), sugerir tier A/B/C.
   - Exibir card "Perfil do Cliente" no `QuoteDrawer` (win-rate, ticket médio, portais preferidos).

3. **Feedback Loop no Flywheel**
   - Quando quote vira `ganho`/`perdido`, atualizar `market_avg` do produto com peso baseado em recência.
   - Registrar `price_delta_vs_suggestion` para calibrar futuras sugestões.

---

### Sprint B — Governança & Auditoria Enterprise

Objetivo: preparar para venda B2B com LGPD/SOC2 mindset.

1. **Audit Trail imutável** (`src/lib/medical/audit-log.ts`)
   - Estender `activity.ts` com hash encadeado (prev_hash → hash) para detectar adulteração.
   - Página `/auditoria` (admin-only via `RoleSwitcher`) com filtros por tenant/usuário/tipo.

2. **Painel de Compliance por Tenant** (`/compliance`)
   - Score consolidado: % de quotes com override, quantas travadas, produtos sem `cmed_ceiling`.
   - Export CSV do log de overrides (evidência para auditoria ANVISA).

3. **Data Residency & Retenção**
   - Config por tenant: `retention_days` para quotes perdidas.
   - Job simulado (localStorage cleanup) que roda no boot e purga dados vencidos.

---

### Sprint C — Preparação para Cloud (fase C da tese multi-tenant)

Objetivo: pavimentar migração sem retrabalho.

1. **Consolidar migrations SQL** (`docs/migrations/`)
   - Unificar `commissions_trigger.sql` + `inbox_views.sql` + schema completo do `docs/supabase-schema.md`.
   - Adicionar tabelas novas: `portal_ingest_events`, `client_intelligence`, `audit_log`, `tenant_configs`.
   - Todas com GRANTs + RLS por `tenant_id` + `has_role()` security definer.

2. **Repository pattern** (`src/lib/medical/repo/`)
   - Interface `QuoteRepo`, `ProductRepo`, `TenantRepo` com implementação `LocalStorageRepo` atual.
   - Stub `SupabaseRepo` que os hooks já consomem via `useRepo()` — trocar backend = trocar 1 provider.

3. **Feature flag `USE_CLOUD`**
   - Env `VITE_USE_CLOUD=false` mantém mock; `true` liga stubs Supabase (ainda vazios até o Cloud ser ativado).

---

### Sprint D — Extensão Chrome (Browser Agent)

Objetivo: capturar RFQs reais dos portais.

1. **Manifest MV3** (`extension/manifest.json`) com host_permissions para bionexo.com.br, apoiocotacao.com.br.
2. **Content-script Bionexo** — parser DOM + POST para `/api/v1/ingest` com API key salva em `chrome.storage.sync`.
3. **Popup de configuração** — colar API key + selecionar tenant + toggle por portal.
4. **Empacotamento** — `bun run build:extension` gera `public/use-medical-extension.zip` linkado em `/integracoes`.

---

### Ordem sugerida

**Agora:** Sprint A (auto-draft + client intel) — completa a tese do "Sistema Ativo".
**Depois:** Sprint B (governança) — destrava conversas enterprise.
**Antes de ativar Cloud:** Sprint C (repository pattern).
**Quando houver tempo dedicado:** Sprint D (extensão).

### Fora de escopo (mantido para depois)

- IA generativa real (LLM) para redação de e-mail de resposta — depende de Cloud + Lovable AI Gateway.
- App mobile nativo — PWA atual cobre 95% dos casos.
- Integração real com ERPs (Use Sistemas, TOTVS, Sankhya) — hoje é mock; requer credenciais reais dos clientes.
