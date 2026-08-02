// Camada de API do Ecossistema (Fase 3).
// Helpers compartilhados entre os endpoints `/api/public/ecosystem/*`:
// autenticação por parceiro (HMAC), rate-limit por parceiro e parsing de body.
//
// As rotas chamam estas funções e traduzem o resultado para Response HTTP.

import { z } from "zod";
import {
  getPartner,
  verifyPartnerSignature,
  type EcosystemPartner,
} from "./partners";
import { rateLimit, rateLimitHeaders } from "../rate-limit";

export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-partner-signature",
};

export const ExternalQuoteSchema = z.object({
  partner_id: z.string().min(1),
  external_id: z.string().min(1),
  customer: z.object({
    name: z.string().min(1),
    segment: z.string().optional(),
    document: z.string().optional(),
  }),
  items: z
    .array(
      z.object({
        sku: z.string().min(1),
        quantity: z.number().positive(),
        target_price: z.number().nonnegative().optional(),
      }),
    )
    .min(1),
  metadata: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});

export const OrderCallbackSchema = z.object({
  partner_id: z.string().min(1),
  order_id: z.string().min(1),
  status: z.enum(["confirmed", "shipped", "delivered", "cancelled"]),
  occurred_at: z.string().datetime().optional(),
});

export type ParsedExternalQuote = z.infer<typeof ExternalQuoteSchema>;
export type ParsedOrderCallback = z.infer<typeof OrderCallbackSchema>;

export type AuthResult =
  | { ok: true; partner: EcosystemPartner }
  | { ok: false; status: number; error: string };

/** Autentica um request por parceiro: header `x-partner-signature` HMAC do body cru. */
export function authenticatePartner(
  partnerId: string | null,
  rawBody: string,
  signatureHeader: string | null | undefined,
): AuthResult {
  if (!partnerId) {
    return { ok: false, status: 400, error: "partner_id é obrigatório" };
  }
  const partner = getPartner(partnerId);
  if (!partner) {
    return { ok: false, status: 404, error: `Parceiro desconhecido: ${partnerId}` };
  }
  if (!verifyPartnerSignature(partner, rawBody, signatureHeader)) {
    return { ok: false, status: 401, error: "Assinatura HMAC inválida" };
  }
  return { ok: true, partner };
}

/** Rate-limit por parceiro (reusa o bucket em memória do rate-limit). */
export function partnerRateLimit(
  partner: EcosystemPartner,
  keyPrefix = "ecosystem",
): { ok: boolean; headers: Record<string, string> } {
  const rl = rateLimit(`${keyPrefix}:${partner.id}`, {
    max: partner.rate_limit_per_min,
    windowMs: 60_000,
  });
  return { ok: rl.ok, headers: rateLimitHeaders(rl) };
}

/** Lê o corpo cru (text) de forma segura, com limite de tamanho. */
export async function readRawBody(request: Request, maxBytes = 256_000): Promise<string> {
  const text = await request.text();
  if (text.length > maxBytes) throw new Error("Payload muito grande");
  return text;
}

/** Verifica se o parceiro possui um escopo. */
export function partnerHasScope(partner: EcosystemPartner, scope: string): boolean {
  return partner.scopes.includes(scope);
}

