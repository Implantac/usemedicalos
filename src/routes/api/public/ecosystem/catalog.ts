import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { authenticatePartner, CORS, partnerHasScope, partnerRateLimit, readRawBody } from "@/lib/medical/ecosystem/api";

// Ecosystem API — GET /api/public/ecosystem/catalog
// Parceiro consulta o catálogo do distribuidor (projeção segura: sem custo/preço sugerido).
// Autenticação: header `x-partner-signature` (HMAC do query string / body vazio).

export const Route = createFileRoute("/api/public/ecosystem/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      GET: async ({ request }) => {
        const url = new URL(request.url);
        const partnerId = url.searchParams.get("partner_id");
        const signature = url.searchParams.get("signature");

        if (!partnerId) {
          return Response.json({ ok: false, error: "partner_id é obrigatório" }, { status: 400, headers: CORS });
        }

        // Autenticação: assina o query string (sem o próprio signature).
        const queryWithoutSig = new URLSearchParams(url.searchParams);
        queryWithoutSig.delete("signature");
        const rawBody = queryWithoutSig.toString();

        const auth = authenticatePartner(partnerId, rawBody, signature);
        if (!auth.ok) {
          return Response.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS });
        }
        if (!partnerHasScope(auth.partner, "catalog:read")) {
          return Response.json(
            { ok: false, error: "Parceiro sem escopo catalog:read" },
            { status: 403, headers: CORS },
          );
        }
        const rl = partnerRateLimit(auth.partner, "catalog");
        if (!rl.ok) {
          return Response.json({ ok: false, error: "Rate limit exceeded" }, {
            status: 429,
            headers: { ...CORS, ...rl.headers, "Retry-After": "60" },
          });
        }

        const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

        const filtered = q
          ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
          : PRODUCTS;

        const items = filtered.slice(offset, offset + limit).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
        }));

        return Response.json(
          { ok: true, total: filtered.length, limit, offset, items },
          { headers: { ...CORS, ...rl.headers, "Cache-Control": "public, max-age=60" } },
        );
      },

      POST: async ({ request }) => {
        // Aceita POST também (alguns clientes preferem), com o corpo assinado.
        let rawBody: string;
        try {
          rawBody = await readRawBody(request);
        } catch {
          return Response.json({ ok: false, error: "Payload muito grande" }, { status: 413, headers: CORS });
        }
        let json: unknown;
        try {
          json = JSON.parse(rawBody);
        } catch {
          return Response.json({ ok: false, error: "JSON inválido" }, { status: 400, headers: CORS });
        }
        const body = json as { partner_id?: string; q?: string; limit?: number; offset?: number };
        const auth = authenticatePartner(body.partner_id ?? null, rawBody, request.headers.get("x-partner-signature"));
        if (!auth.ok) {
          return Response.json({ ok: false, error: auth.error }, { status: auth.status, headers: CORS });
        }
        if (!partnerHasScope(auth.partner, "catalog:read")) {
          return Response.json({ ok: false, error: "Parceiro sem escopo catalog:read" }, { status: 403, headers: CORS });
        }
        const rl = partnerRateLimit(auth.partner, "catalog");
        if (!rl.ok) {
          return Response.json({ ok: false, error: "Rate limit exceeded" }, {
            status: 429,
            headers: { ...CORS, ...rl.headers, "Retry-After": "60" },
          });
        }
        const q = (body.q ?? "").trim().toLowerCase();
        const limit = Math.min(Math.max(Number(body.limit ?? 50), 1), 200);
        const offset = Math.max(Number(body.offset ?? 0), 0);
        const filtered = q
          ? PRODUCTS.filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
          : PRODUCTS;
        const items = filtered.slice(offset, offset + limit).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
        }));
        return Response.json(
          { ok: true, total: filtered.length, limit, offset, items },
          { headers: { ...CORS, ...rl.headers } },
        );
      },
    },
  },
});

