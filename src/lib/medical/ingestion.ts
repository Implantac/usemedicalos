// Ingestion Engine — recebe RFQs de portais externos (Bionexo, Apoio, etc.)
// e cria cotações locais com status "pending_review". Compartilhado entre
// endpoint HTTP (/api/v1/ingest) e simulador in-app.
//
// TODO(cloud): quando Cloud ativar, persistir em `quotes` + `quote_portal_meta`
// via supabaseAdmin com trigger pg_net para dispatch de push/webhook.

import { z } from "zod";
import type { Quote, SourcePlatform } from "./types";

export const IngestItemSchema = z.object({
  sku: z.string().min(1).max(80),
  name: z.string().min(1).max(200),
  quantity: z.number().positive().max(1_000_000),
  unit: z.string().max(20).optional(),
  target_price: z.number().nonnegative().optional(),
});

export const IngestPayloadSchema = z.object({
  source_platform: z.enum(["bionexo", "apoio", "clickmed", "portal_gov", "outro"]),
  portal_reference: z.string().min(1).max(120),
  portal_opened_at: z.string().datetime().or(z.string().min(4)),
  customer_name: z.string().min(1).max(200),
  customer_segment: z.string().max(80).optional(),
  raw_data: z.unknown().optional(),
  items: z.array(IngestItemSchema).min(1).max(200),
});

export type IngestPayload = z.infer<typeof IngestPayloadSchema>;

export const SOURCE_PLATFORM_LABEL: Record<SourcePlatform, string> = {
  bionexo: "Bionexo",
  apoio: "Apoio Cotação",
  clickmed: "ClickMed",
  portal_gov: "Portal Gov (ComprasNet)",
  outro: "Outro portal",
};

// Constrói uma Quote a partir do payload — usado no client (localStorage).
// tenantId e ownerId são resolvidos pelo caller (via API key ou tenant ativo).
export function buildQuoteFromPayload(
  payload: IngestPayload,
  ctx: { tenantId: string; ownerId: string },
): Quote {
  const now = new Date();
  return {
    id: `q${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    tenant_id: ctx.tenantId,
    owner_id: ctx.ownerId,
    source_type: "portal",
    status: "pending_review",
    priority: "alta", // portal externo entra como alta por padrão
    customer_name: payload.customer_name,
    customer_segment: payload.customer_segment ?? "hospital",
    received_at: now.toISOString(),
    sla_deadline: new Date(now.getTime() + 4 * 3_600_000).toISOString(), // 4h SLA portal
    original_payload:
      typeof payload.raw_data === "string"
        ? payload.raw_data
        : JSON.stringify(payload.raw_data ?? payload, null, 2),
    keywords: [payload.source_platform, "portal"],
    items: payload.items.map((it) => ({
      product_id: `ext_${it.sku}`,
      sku: it.sku,
      name: it.name,
      quantity: it.quantity,
      unit_price: it.target_price ?? 0,
      cost_price: 0,
    })),
    portal_meta: {
      source_platform: payload.source_platform,
      portal_reference: payload.portal_reference,
      portal_opened_at: new Date(payload.portal_opened_at).toISOString(),
      ingested_at: now.toISOString(),
    },
  };
}

// Formata "tempo desde o portal" para live-log/watchdog.
export function elapsedSincePortal(portalOpenedAt: string): string {
  const ms = Date.now() - new Date(portalOpenedAt).getTime();
  const mins = Math.round(ms / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60);
  const rem = mins % 60;
  if (h < 24) return `${h}h ${rem}m`;
  const d = Math.floor(h / 24);
  return `${d}d ${h % 24}h`;
}
