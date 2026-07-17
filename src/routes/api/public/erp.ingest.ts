import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { applyMapping, type ErpMappingConfig } from "@/lib/medical/erp-mapping";

// Endpoint público para ingestão de payloads ERP arbitrários.
// O tenant envia o payload cru + mapping (ou usa mapping salvo — futuro).
// Autenticação por bearer token do tenant (mock — validar quando Cloud ativo).

const Body = z.object({
  tenant_token: z.string().min(8),
  mapping: z.custom<ErpMappingConfig>((v) => typeof v === "object" && v !== null),
  payload: z.unknown(),
});

export const Route = createFileRoute("/api/public/erp/ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const expected = process.env.ERP_INGEST_TOKEN;
        let json: unknown;
        try {
          json = await request.json();
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
        if (expected && parsed.data.tenant_token !== expected) {
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
          docs: "POST { tenant_token, mapping, payload }. Retorna draft de quote.",
        }),
    },
  },
});
