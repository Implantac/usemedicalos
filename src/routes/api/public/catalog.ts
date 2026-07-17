import { createFileRoute } from "@tanstack/react-router";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { clientKey, rateLimit, rateLimitHeaders } from "@/lib/medical/rate-limit";

// Endpoint público read-only do catálogo (Ecosystem API).
// Projeta apenas colunas seguras: NÃO expõe cost_price nem last_suggested_price.
// TODO(cloud): substituir por SELECT sobre products com policy TO anon
// (SELECT id, name, sku, unit) e paginação server-side.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const Route = createFileRoute("/api/public/catalog")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") ?? "").trim().toLowerCase();
        const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 200);
        const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

        const filtered = q
          ? PRODUCTS.filter(
              (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
            )
          : PRODUCTS;

        const items = filtered.slice(offset, offset + limit).map((p) => ({
          id: p.id,
          sku: p.sku,
          name: p.name,
          unit: p.unit,
        }));

        return Response.json(
          { ok: true, total: filtered.length, limit, offset, items },
          { headers: { ...CORS, "Cache-Control": "public, max-age=60" } },
        );
      },
    },
  },
});
