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

export function resolvePartnerSecret(partner: EcosystemPartner): string | undefined {
  return process.env[partner.secret_ref];
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

