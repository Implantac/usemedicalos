# Fase 3 — Ecossistema

## Integration Sandbox (self-service)
- [x] Portal onde admin do tenant define JSON mapping do ERP dele:
  ```json
  {
    "source": "protheus_custom",
    "endpoint": "https://api.cliente.com/quotes",
    "auth": { "type": "bearer", "secret_ref": "CLIENT_ERP_TOKEN" },
    "map": { "customer_name": "$.cliente.razao", "items[].sku": "$.produtos[*].codigo" }
  }
  ```
- [x] Validação: schema Zod + dry-run com payload de exemplo.
- [x] Ativação sem suporte técnico.

## Ecosystem API (parceiros)
- [x] REST público sob `/api/public/ecosystem/*` com HMAC por parceiro.
- [x] Endpoints:
  - `POST /quotes` (marketplace envia cotação → USE)
  - `GET /catalog` (parceiro consulta catálogo do distribuidor)
  - `POST /orders/callback` (webhook status)
- [x] Rate limit + assinatura obrigatória.
- Implementação: `src/lib/medical/ecosystem/partners.ts` (registro + HMAC), `api.ts` (auth + rate-limit + schemas Zod), rotas em `src/routes/api/public/ecosystem/*`.

## Bionexo & marketplaces hospitalares
- [x] Adaptador em `src/lib/medical/ecosystem/bionexo.ts` (payload Bionexo → `IngestPayload`/`Quote`).
- [x] Ownership: cada quote traz `origin_partner_id`.
- [x] Testes: `partners.test.ts`, `bionexo.test.ts`, `api.test.ts` (16 testes).

## Ecossistema na Interface (UF)
- [x] `PartnerTag` em `src/components/medical/badges.tsx` — exibe Bionexo / Apoio / Marketplace via `origin_partner_id` (render vazio quando ausente).
- [x] Selo de origem nas 3 superfícies:
  - `quote-inbox.tsx` (linha detalhada + coluna `partner` nos CSVs de export);
  - `quote-drawer.tsx` (ao lado do `SourceTag`);
  - `tender-board.tsx` (ao lado do selo de origem).
- [x] Fallback dev para HMAC em `src/lib/medical/ecosystem/partners.ts`: `resolvePartnerSecret` usa a env var em produção e um secret determinístico `dev-<partnerId>-secret` em dev/preview (sem env var, sandbox funciona).
- [x] Simulador de Ecossistema:
  - `src/lib/medical/ecosystem/simulator.ts` — gera payload RFQ, assina com `signForPartner`, POST em `/api/public/ecosystem/quotes`, e `buildLocalQuoteFromSimulation` converte via adaptador Bionexo para ingestão local;
  - Card "Simulador de Ecossistema" em `src/routes/integracoes.tsx` com "Enviar RFQ simulada" e "Ingerir localmente" (usa `ingestPortalQuote` e marca `origin_partner_id`).
- [x] Testes: `simulator.test.ts` (8), fallback dev em `partners.test.ts` + `api.test.ts`.
- [x] Suite: 127/127 testes passando, `tsc --noEmit` limpo, eslint 0 erros nos arquivos alterados, `vite build` ok.
