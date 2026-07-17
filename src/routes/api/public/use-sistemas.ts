import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Endpoint público para receber callbacks do Use Sistemas (ex.: confirmação
// de pedido, mudança de status). Sempre validar assinatura HMAC antes de
// processar qualquer coisa.

const PayloadSchema = z.object({
  event: z.enum(["order.created", "order.updated", "order.cancelled"]),
  order_id: z.string().min(1),
  quote_id: z.string().min(1),
  status: z.string().min(1),
  amount: z.number().nonnegative().optional(),
  occurred_at: z.string().datetime().optional(),
});

function verifySignature(body: string, signature: string | null, secret: string): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signature, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const Route = createFileRoute("/api/public/use-sistemas")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.USE_SISTEMAS_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret não configurado.", { status: 503 });
        }

        const raw = await request.text();
        const signature = request.headers.get("x-use-sistemas-signature");
        if (!verifySignature(raw, signature, secret)) {
          return new Response("Assinatura inválida.", { status: 401 });
        }

        let json: unknown;
        try {
          json = JSON.parse(raw);
        } catch {
          return new Response("JSON inválido.", { status: 400 });
        }

        const parsed = PayloadSchema.safeParse(json);
        if (!parsed.success) {
          return Response.json(
            { ok: false, error: "Payload inválido.", issues: parsed.error.issues },
            { status: 422 },
          );
        }

        // TODO(cloud): quando Lovable Cloud estiver ativo, persistir o evento
        // em `use_sistemas_events` e atualizar a quote correspondente via
        // supabaseAdmin (RLS bypass, uso interno).
        // Por enquanto apenas ecoa e loga.
        console.log("[use-sistemas webhook]", parsed.data);

        return Response.json({ ok: true, received: parsed.data.event });
      },
      GET: async () =>
        Response.json({
          ok: true,
          endpoint: "use-sistemas",
          docs: "POST com header x-use-sistemas-signature (HMAC SHA-256 hex do body).",
        }),
    },
  },
});
