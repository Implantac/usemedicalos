import { createFileRoute } from "@tanstack/react-router";
import { IngestPayloadSchema } from "@/lib/medical/ingestion";
import { pushLog, readLog } from "@/lib/medical/ingest-log";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/medical/rate-limit";

// Ingestion Engine — endpoint público que a extensão/scraper chama
// quando detecta uma nova RFQ em portais externos (Bionexo, Apoio, etc.).
//
// Autenticação (fase mock):
//   - Header `x-api-key` obrigatório.
//   - Em dev/preview qualquer token é aceito (será validado contra
//     `tenant_api_keys` quando Cloud ativar).
//   - Em produção com `INGEST_API_KEY` setado, o header precisa bater.
//
// Rate limit: 60 req/min por (IP + key).
// CORS aberto — chamado por extensão de navegador de outra origem.
//
// TODO(cloud): resolver tenant via `resolveApiKey(token)` server-side
// (tabela `tenant_api_keys` com RLS) e persistir a quote em `quotes`
// disparando NOTIFY para o Realtime channel do tenant.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  "Access-Control-Max-Age": "86400",
};

export const Route = createFileRoute("/api/v1/ingest")({
  server: {
    handlers: {
      OPTIONS: async () =>
        new Response(null, { status: 204, headers: CORS }),

      // GET → tail do live-log (usado pelo painel de Conectores).
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const since = url.searchParams.get("since") ?? undefined;
        const events = readLog(since ?? undefined);
        return Response.json(
          { ok: true, events },
          { headers: { ...CORS, "Cache-Control": "no-store" } },
        );
      },

      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-api-key");
        const keyHint = apiKey ? apiKey.slice(-6) : undefined;

        // Rate limit por (IP + fragmento da key).
        const rl = rateLimit(clientKey(request, `ingest:${keyHint ?? "anon"}`), {
          max: 60,
          windowMs: 60_000,
        });
        const rlHeaders = rateLimitHeaders(rl);
        if (!rl.ok) {
          return new Response("Rate limit exceeded", {
            status: 429,
            headers: { ...CORS, ...rlHeaders, "Retry-After": "60" },
          });
        }

        if (!apiKey) {
          pushLog({
            source_platform: "unknown",
            portal_reference: "-",
            customer_name: "-",
            item_count: 0,
            status: "rejected",
            reason: "missing_api_key",
          });
          return Response.json(
            { ok: false, error: "Header x-api-key obrigatório" },
            { status: 401, headers: { ...CORS, ...rlHeaders } },
          );
        }

        const expected = process.env.INGEST_API_KEY;
        if (expected && apiKey !== expected) {
          pushLog({
            source_platform: "unknown",
            portal_reference: "-",
            customer_name: "-",
            item_count: 0,
            status: "rejected",
            reason: "invalid_api_key",
            api_key_id: keyHint,
          });
          return Response.json(
            { ok: false, error: "API key inválida" },
            { status: 401, headers: { ...CORS, ...rlHeaders } },
          );
        }

        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return Response.json(
            { ok: false, error: "JSON inválido" },
            { status: 400, headers: { ...CORS, ...rlHeaders } },
          );
        }
        const parsed = IngestPayloadSchema.safeParse(raw);
        if (!parsed.success) {
          pushLog({
            source_platform: "unknown",
            portal_reference: "-",
            customer_name: "-",
            item_count: 0,
            status: "rejected",
            reason: "invalid_payload",
            api_key_id: keyHint,
          });
          return Response.json(
            { ok: false, error: "Payload inválido", issues: parsed.error.issues },
            { status: 422, headers: { ...CORS, ...rlHeaders } },
          );
        }

        const payload = parsed.data;
        const logEntry = pushLog({
          source_platform: payload.source_platform,
          portal_reference: payload.portal_reference,
          customer_name: payload.customer_name,
          item_count: payload.items.length,
          status: "accepted",
          api_key_id: keyHint,
        });

        // TODO(cloud): supabaseAdmin.from('quotes').insert({...})
        // com status='pending_review' e disparo de push via pg_net.
        return Response.json(
          {
            ok: true,
            event_id: logEntry.id,
            status: "pending_review",
            note:
              "Payload aceito. Persistência local ocorre no client (mock). Migração para Cloud pendente.",
            payload,
          },
          { status: 201, headers: { ...CORS, ...rlHeaders } },
        );
      },
    },
  },
});
