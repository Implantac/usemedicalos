// Registro de parceiros do Ecossistema (Fase 3).
// Cada parceiro possui um secret HMAC compartilhado (`secret_ref` aponta para
// uma variável de ambiente). Lookup determinístico e 100% testável.
//
// TODO(cloud): quando Lovable Cloud for ativado, migrar para tabela
// `ecosystem_partners` com RLS (leitura por admin) e resolver o secret via
// Supabase secrets / Vault.

import { createHmac, timingSafeEqual } from "node:crypto";

export interface EcosystemPartner {
  id: string;
  name: string;
  /** Nome da env var que guarda o secret HMAC compartilhado. */
  secret_ref: string;
  /** Limite de requests por minuto para este parceiro. */
  rate_limit_per_min: number;
  /** Escopos concedidos (quotes:write, catalog:read, orders:callback). */
  scopes: string[];
}

export const ECOSYSTEM_PARTNERS: EcosystemPartner[] = [
  {
    id: "bionexo",
    name: "Bionexo",
    secret_ref: "BIONEXO_HMAC_SECRET",
    rate_limit_per_min: 60,
    scopes: ["quotes:write", "catalog:read"],
  },
  {
    id: "apoio",
    name: "ApoioCotação",
    secret_ref: "APOIO_HMAC_SECRET",
    rate_limit_per_min: 60,
    scopes: ["quotes:write", "catalog:read"],
  },
  {
    id: "marketplace_demo",
    name: "Marketplace Demo",
    secret_ref: "MARKETPLACE_DEMO_HMAC_SECRET",
    rate_limit_per_min: 120,
    scopes: ["quotes:write", "catalog:read", "orders:callback"],
  },
];

export function getPartner(id: string): EcosystemPartner | undefined {
  return ECOSYSTEM_PARTNERS.find((p) => p.id === id);
}

/**
 * Resolve o secret HMAC de um parceiro.
 *
 * Ordem de prioridade:
 *   1. Env var configurada (`BIONEXO_HMAC_SECRET`, etc.) — produção/Cloud.
 *   2. Secret determinístico de DEV (`dev-<partnerId>-secret`) — permite usar o
 *      sandbox de Ecosystem no preview/local sem configurar nada.
 *
 * O fallback de dev usa um valor derivado do id (não hardcoded igual para todos),
 * mas que NUNCA deve ser usado em produção — em produção sempre se seta a env.
 */
export function resolvePartnerSecret(partner: EcosystemPartner): string | undefined {
  const fromEnv = process.env[partner.secret_ref];
  if (fromEnv) return fromEnv;
  if (import.meta.env?.DEV || import.meta.env?.MODE !== "production") {
    return `dev-${partner.id}-secret`;
  }
  return undefined;
}

/**
 * Secrets de dev por parceiro (para uso no simulador / testes).
 * Em produção essas chaves são ignoradas — `resolvePartnerSecret` prioriza a env.
 */
export function devPartnerSecret(partnerId: string): string {
  return `dev-${partnerId}-secret`;
}

/** Assina um corpo com o secret do parceiro (hex). Retorna null se indisponível. */
export function signForPartner(partnerId: string, body: string): string | null {
  const partner = getPartner(partnerId);
  if (!partner) return null;
  const secret = resolvePartnerSecret(partner);
  if (!secret) return null;
  return createHmac("sha256", secret).update(body).digest("hex");
}

/** Verifica assinatura HMAC-SHA256 (hex) do parceiro de forma timing-safe. */
export function verifyPartnerSignature(
  partner: EcosystemPartner,
  body: string,
  signatureHeader: string | null | undefined,
): boolean {
  if (!signatureHeader) return false;
  const secret = resolvePartnerSecret(partner);
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const a = Buffer.from(signatureHeader, "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
