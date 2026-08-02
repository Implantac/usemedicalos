import { createFileRoute } from "@tanstack/react-router";
import {
  authenticatePartner,
  CORS,
  ExternalQuoteSchema,
  partnerHasScope,
  partnerRateLimit,
  readRawBody,
} from "@/lib/medical/ecosystem/api";
import { bionexoToQuote } from "@/lib/medical/ecosystem/bionexo";
import { TENANT, OWNERS } from "@/lib/medical/mock-data";

// Ecosystem API — POST /api/public/ecosystem/quotes
// Marketplace/portal envia uma cotação (RFQ) para a USE Medical.
// Autenticação: header `x-partner-signature` (HMAC-SHA256 hex do body cru)
// usando o secret do parceiro registrado em `partners.ts`.
//
// TODO(cloud): persistir a quote em `quotes` via supabaseAdmin (RLS bypass)
// com `origin_partner_id` e disparar Realtime/push para a inbox do tenant.

export const Route = createFileRoute("/api/public/ecosystem/quotes")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        let rawBody: string;
        try {
          rawBody = await readRawBody(request);
        } catch {
          return Response.json({ ok: false, error: "Payload muito grande" }, {
            status: 413,
            headers: CORS,
          });
        }

        // 1. Parse rápido para extrair partner_id antes de autenticar.
        let json: unknown;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, {
            status: 400,
            headers: CORS,
          });
        }

        const parsed = ExternalQuoteSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Body inválido", issues: parsed.error.issues },
            { status: 422, headers: CORS },
          );
        }

        // 2. Autenticação por parceiro (HMAC).
        const auth = authenticatePartner(
          parsed.data.partner_id,
          rawBody,
          request.headers.get("x-partner-signature"),
        );
        if (!auth.ok) {
          return Response.json({ ok: false, error: auth.error }, {
            status: auth.status,
            headers: CORS,
          });
        }

        // 3. Escopo.
        if (!partnerHasScope(auth.partner, "quotes:write")) {
          return Response.json(
            { ok: false, error: "Parceiro sem escopo quotes:write" },
            { status: 403, headers: CORS },
          );
        }

        // 4. Rate limit por parceiro.
        const rl = partnerRateLimit(auth.partner, "quotes");
        if (!rl.ok) {
          return Response.json({ ok: false, error: "Rate limit exceeded" }, {
            status: 429,
            headers: { ...CORS, ...rl.headers, "Retry-After": "60" },
          });
        }

        const data = parsed.data;

        // 5. Converte para o shape interno de quote (via adaptador Bionexo,
        //    que também lida com o formato genérico de marketplace).
        const converted = bionexoToQuote(
          {
            id: data.external_id,
            hospital: { nome: data.customer.name, segmento: data.customer.segment },
            itens: data.items.map((it) => ({
              codigo: it.sku,
              descricao: it.sku,
              quantidade: it.quantity,
              preco_alvo: it.target_price,
            })),
          },
          {
            tenantId: TENANT.id,
            ownerId: OWNERS[0].id,
            partnerId: data.partner_id,
          },
        );

        if (!converted.ok || !converted.quote) {
          return Response.json(
            { ok: false, error: "Falha ao converter cotação", errors: converted.errors },
            { status: 422, headers: CORS },
          );
        }

        // TODO(cloud): `converted.quote` já carrega `origin_partner_id` — persistir aqui.
        return Response.json(
          {
            ok: true,
            quote_id: converted.quote.id,
            external_id: data.external_id,
            status: converted.quote.status,
            origin_partner_id: data.partner_id,
          },
          { status: 201, headers: { ...CORS, ...rl.headers } },
        );
      },

      GET: async () =>
        Response.json(
          {
            ok: true,
            endpoint: "ecosystem/quotes",
            docs: "POST { partner_id, external_id, customer, items } com header x-partner-signature (HMAC-SHA256 hex do body).",
          },
          { headers: CORS },
        ),
    },
  },
});

