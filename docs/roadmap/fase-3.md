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
