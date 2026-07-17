# Fase 3 — Ecossistema

## Integration Sandbox (self-service)
- Portal onde admin do tenant define JSON mapping do ERP dele:
  ```json
  {
    "source": "protheus_custom",
    "endpoint": "https://api.cliente.com/quotes",
    "auth": { "type": "bearer", "secret_ref": "CLIENT_ERP_TOKEN" },
    "map": { "customer_name": "$.cliente.razao", "items[].sku": "$.produtos[*].codigo" }
  }
  ```
- Validação: schema Zod + dry-run com payload de exemplo.
- Ativação sem suporte técnico.

## Ecosystem API (parceiros)
- REST público sob `/api/public/ecosystem/*` com HMAC por parceiro.
- Endpoints:
  - `POST /quotes` (marketplace envia cotação → USE)
  - `GET /catalog` (parceiro consulta catálogo do distribuidor)
  - `POST /orders/callback` (webhook status)
- Rate limit + assinatura obrigatória.

## Bionexo & marketplaces hospitalares
- Adaptador em `src/lib/medical/ecosystem/bionexo.ts` (scaffold).
- Ownership: cada quote traz `origin_partner_id`.
