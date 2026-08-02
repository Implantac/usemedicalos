import { createFileRoute } from "@tanstack/react-router";
import {
  authenticatePartner,
  CORS,
  OrderCallbackSchema,
  partnerHasScope,
  partnerRateLimit,
  readRawBody,
} from "@/lib/medical/ecosystem/api";

// Ecosystem API — POST /api/public/ecosystem/orders/callback
// Webhook de status de pedido: o marketplace/portal informa que um pedido
// foi confirmado, enviado, entregue ou cancelado.
// Autenticação: header `x-partner-signature` (HMAC-SHA256 hex do body cru).
//
// TODO(cloud): atualizar a quote correspondente via supabaseAdmin e disparar
// notificação para o dono da cotação.

export const Route = createFileRoute("/api/public/ecosystem/orders/callback")({
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

        let json: unknown;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, {
            status: 400,
            headers: CORS,
          });
        }

        const parsed = OrderCallbackSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Body inválido", issues: parsed.error.issues },
            { status: 422, headers: CORS },
          );
        }

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

        if (!partnerHasScope(auth.partner, "orders:callback")) {
          return Response.json(
            { ok: false, error: "Parceiro sem escopo orders:callback" },
            { status: 403, headers: CORS },
          );
        }

        const rl = partnerRateLimit(auth.partner, "orders");
        if (!rl.ok) {
          return Response.json({ ok: false, error: "Rate limit exceeded" }, {
            status: 429,
            headers: { ...CORS, ...rl.headers, "Retry-After": "60" },
          });
        }

        const { order_id, status, occurred_at } = parsed.data;

        // TODO(cloud): atualizar quote.status / quote.use_sistemas_order_id e logar em activity.
        return Response.json(
          {
            ok: true,
            order_id,
            status,
            received_at: occurred_at ?? new Date().toISOString(),
          },
          { status: 200, headers: { ...CORS, ...rl.headers } },
        );
      },

      GET: async () =>
        Response.json(
          {
            ok: true,
            endpoint: "ecosystem/orders/callback",
            docs: "POST { partner_id, order_id, status } com header x-partner-signature (HMAC-SHA256 hex do body).",
          },
          { headers: CORS },
        ),
    },
  },
});

