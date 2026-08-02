# Plano — Fase 3: Ecossistema (Ecosystem API + Bionexo + origin_partner_id)

## Contexto
- Fase 2 (Benchmarking + Regulated AI) e a feature de Licitações já estão completas (101/101 testes).
- Fase 3 está parcialmente scaffoldada: `ecosystem-types.ts` (só tipos), `erp-mapping.ts` (funciona),
  API keys + webhook HMAC + rate-limit. Faltam os endpoints Ecosystem, o adaptador Bionexo
  e o `origin_partner_id` no modelo.

## Etapas
### 1. Modelo + tipos
- [x] Adicionar `origin_partner_id?: string` ao `Quote` em `src/lib/medical/types.ts`
- [x] Ampliar `src/lib/medical/ecosystem-types.ts` com tipos de resposta (QuoteResult, CallbackResult, etc.)

### 2. Registro de parceiros
- [x] Criar `src/lib/medical/ecosystem/partners.ts` — registro de parceiros (id, name, secret_ref, rate_limit) + lookup por id + validação HMAC por parceiro

### 3. Adaptador Bionexo
- [x] Criar `src/lib/medical/ecosystem/bionexo.ts` — transforma payload do portal Bionexo em `IngestPayload`/`Quote`

### 4. Ecosystem API (server routes)
- [x] Criar `src/routes/api/public/ecosystem/quotes.ts` — `POST` (marketplace envia cotação) com HMAC por parceiro + rate-limit
- [x] Criar `src/routes/api/public/ecosystem/catalog.ts` — `GET` (parceiro consulta catálogo)
- [x] Criar `src/routes/api/public/ecosystem/orders/callback.ts` — `POST` (webhook status de pedido)
- [x] Regenerar `routeTree.gen.ts` com as 3 novas rotas (`tsr generate`)
- [x] Autenticação server-side: HMAC por parceiro registrado (`x-partner-signature`) + rate-limit por parceiro + escopos
- [ ] Cloud: migrar `resolveApiKey`/partners para Supabase (ver TODO(cloud) nos arquivos)

### 5. Testes
- [x] `src/lib/medical/ecosystem/partners.test.ts`
- [x] `src/lib/medical/ecosystem/bionexo.test.ts`
- [x] `src/lib/medical/ecosystem/api.test.ts` (validação HMAC, rate-limit, payload inválido)

### 6. Integração + docs
- [x] Conectar `origin_partner_id` nas cotações ingeridas via Ecosystem API (`bionexoToQuote` com `partnerId`)
- [x] Atualizar `docs/roadmap/fase-3.md` com checkboxes concluídos

## Verificação final
- [x] `vitest run` passando (117 testes, 30 arquivos)
- [x] `tsc --noEmit` sem erros
- [x] `eslint` limpo nos arquivos da feature

