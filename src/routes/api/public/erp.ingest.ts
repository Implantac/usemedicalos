import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { applyMapping, type ErpMappingConfig } from "@/lib/medical/erp-mapping";
import { verifySignature } from "@/lib/medical/webhook-signature";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/medical/rate-limit";

// Endpoint público para ingestão de payloads ERP arbitrários.
// Segurança: assinatura HMAC-SHA256 via header `x-use-signature`.
// Chave: env ERP_INGEST_SECRET (por enquanto global — quando Cloud ativar,
// resolver por tenant via supabaseAdmin usando `tenant_token`).

const Body = z.object({
  tenant_token: z.string().min(8),
  mapping: z.custom<ErpMappingConfig>((v) => typeof v === "object" && v !== null),
  payload: z.unknown(),
});

export const Route = createFileRoute("/api/public/erp/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.ERP_INGEST_SECRET;
        const rawBody = await request.text();

        if (secret) {
          const sig = request.headers.get("x-use-signature");
          const ok = await verifySignature(secret, rawBody, sig);
          if (!ok) return new Response("Assinatura inválida", { status: 401 });
        }

        let json: unknown;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return new Response("JSON inválido", { status: 400 });
        }
        const parsed = Body.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Body inválido", issues: parsed.error.issues },
            { status: 422 },
          );
        }

        const expectedToken = process.env.ERP_INGEST_TOKEN;
        if (expectedToken && parsed.data.tenant_token !== expectedToken) {
          return new Response("Token inválido", { status: 401 });
        }

        const result = applyMapping(parsed.data.payload, parsed.data.mapping);
        if (!result.ok) {
          return Response.json({ ok: false, errors: result.errors }, { status: 422 });
        }

        // TODO(cloud): persistir em quotes via supabaseAdmin com tenant_id resolvido do token.
        return Response.json({ ok: true, draft: result.draft });
      },
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "erp/ingest",
          docs:
            "POST { tenant_token, mapping, payload } com header x-use-signature: sha256=<HMAC do body cru usando ERP_INGEST_SECRET>. Retorna draft de quote.",
        }),
    },
  },
});
