## Ingestion Engine — Monitoramento de Cotações em Tempo Real

Vamos transformar o USE Medical de "sistema passivo" em "sistema ativo" adicionando um motor de ingestão que recebe cotações capturadas de portais externos (Bionexo, Apoio, ClickMed, etc.) via API autenticada, gera alertas imediatos e mede o SLA "portal → resposta".

Continua tudo no mock localStorage (fase B da tese multi-tenant). O endpoint público já é HTTP real — pronto para receber requests de uma extensão de navegador ou scraper headless quando o Cloud for ativado.

---

### 1. Endpoint público `POST /api/v1/ingest`

Novo arquivo `src/routes/api/v1/ingest.ts` (server route TanStack, prefixo `/api/public` via alias interno para bypassar auth em produção):

- Payload validado com Zod:
  ```
  {
    source_platform: "bionexo" | "apoio" | "clickmed" | "portal_gov" | "outro",
    portal_reference: string,       // ID da RFQ no portal externo
    portal_opened_at: string,       // ISO — quando a cotação apareceu no portal
    customer_name: string,
    customer_segment?: string,
    raw_data: unknown,              // JSON bruto do portal (auditoria)
    items: Array<{ sku, name, quantity, unit?, target_price? }>
  }
  ```
- Autenticação: header `x-api-key` obrigatório, validado contra as chaves geradas em `/api-keys` (reuso do `src/lib/medical/api-keys.ts`, escopado por tenant).
- Rate limit: reuso de `src/lib/medical/rate-limit.ts` (60 req/min por chave).
- Resposta 201 com `{ quote_id, status: "pending_review" }` ou 4xx com erro estruturado.
- CORS aberto (`OPTIONS` + headers) — a extensão vai chamar de origem externa.

### 2. Novo status `pending_review` + campos de portal

Extensão do modelo `Quote` em `src/lib/medical/types.ts`:
- Adiciona `"pending_review"` ao union `QuoteStatus`.
- Novo bloco opcional `portal_meta`: `{ source_platform, portal_reference, portal_opened_at, ingested_at, response_at? }`.

Ajusta labels (`STATUS_LABEL`), badges (`badges.tsx`) e pipeline (`pipeline.ts`) para reconhecer o novo status como "início do funil ativo".

### 3. Ingestion service (compartilhado entre API real e simulador)

Novo `src/lib/medical/ingestion.ts`:
- `ingestQuote(payload, apiKey)`: valida tenant via chave, cria a quote com status `pending_review`, popula `portal_meta`, aplica `classify()` no `raw_data`, empurra `appendActivity({type:"ingested_from_portal"})` e dispara notificação SLA via `outbound-webhooks`.
- Reaproveitado tanto pelo endpoint HTTP quanto por um "botão simulador" na UI (para demo sem extensão instalada).

### 4. Painel Conectores → aba "Portais em tempo real"

Em `src/routes/integracoes.tsx`, nova seção `PortalMonitorCard`:
- **Live log**: lista das últimas 50 cotações ingeridas (source_platform, cliente, itens, tempo desde o portal, status). Auto-refresh a cada 5s via `useEffect` + polling.
- **Simulador**: dropdown de portal + botão "Simular RFQ recebida" que chama `ingestQuote()` localmente com um payload fake (útil enquanto a extensão não existe).
- **Snippet de integração**: bloco copiável mostrando `curl` de exemplo com a API Key ativa e a URL `https://<preview>/api/v1/ingest`.

### 5. Dashboard "SLA Watchdog"

Novo route `src/routes/sla-watchdog.tsx` (aparece no header entre "Inteligência" e "Exceções"):
- **Hero KPI**: tempo médio "portal → primeira resposta" nas últimas 24h/7d/30d, colorido pelo SLA config do tenant.
- **Ranking de portais**: qual portal está com maior atraso, quantas RFQs pendentes.
- **Tabela de RFQs em risco**: cotações `pending_review` ou `aguardando_precificacao` com origem portal, ordenadas por `portal_opened_at` ASC, com botão "Assumir" (muda status → `aguardando_precificacao` e grava `response_at`).
- Reuso de `KpiCard`, `SlaIndicator` e utilitários de `analytics.ts`.

### 6. Notificação ativa

- `SlaAlertBell` já existe; estende com badge extra para `pending_review` (tom laranja "Nova RFQ do portal").
- Ao ingerir, dispara `notifyPushSubscribers()` (native Notification API) com título "Nova RFQ Bionexo · margem estimada X%" quando o usuário permitiu push.

### 7. Testes

- `src/lib/medical/ingestion.test.ts`: valida payload, rejeita API key inválida, cria quote com status correto, grava `portal_meta`, aciona activity log.
- Update do smoke Playwright para abrir `/sla-watchdog` e verificar render.

### 8. Documentação

- `docs/ingestion-api.md`: contrato do endpoint, exemplos de payload por portal (Bionexo, Apoio), header de autenticação, códigos de erro, rate limit.
- Referência à futura extensão em `docs/roadmap/browser-agent.md` (esqueleto do manifest MV3, comunicação com o endpoint, roadmap fase B: scraper headless).

---

## Fora do escopo desta sprint

- Código real da extensão Chrome (MV3) — fica como esqueleto documentado; podemos gerar em sprint separada.
- Scraper headless (Playwright/Puppeteer server-side) — requer Cloud + worker dedicado.
- "Resposta automática" com preço pré-preenchido — depende de tier do cliente + histórico. Sprint seguinte, depois que o watchdog validar volume.

## Depois desta sprint (ordem sugerida)

1. Gerar a extensão Chrome MV3 (`extension/` + zip em `public/`) com content-script para Bionexo.
2. Ativar Lovable Cloud e migrar `ingestQuote` para persistir em `quotes` real (com trigger de notificação via `pg_net`).
3. Fase 2 — resposta automática para clientes tier A com histórico ≥ 3 wins.