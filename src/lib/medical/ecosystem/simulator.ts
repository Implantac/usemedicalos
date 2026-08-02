// Simulador de Ecossistema (Fase 3)
//
// Exercita o fluxo completo de um parceiro externo (Bionexo / Apoio / Marketplace)
// contra a Ecosystem API real: gera um payload de RFQ, assina com HMAC do parceiro
// e envia para `POST /api/public/ecosystem/quotes`, obtendo `quote_id` +
// `origin_partner_id` de volta.
//
// Em dev/preview, a assinatura usa `devPartnerSecret` (fallback do `partners.ts`);
// em produção, usa a env var configurada. Determinístico e testável.

import { bionexoToQuote } from "./bionexo";
import { devPartnerSecret, getPartner, signForPartner } from "./partners";
import { TENANT, OWNERS } from "@/lib/medical/mock-data";
import type { Quote } from "@/lib/medical/types";

export type SimulablePartnerId = "bionexo" | "apoio" | "marketplace_demo";

export interface EcosystemQuoteResponse {
  ok: boolean;
  quote_id?: string;
  external_id?: string;
  status?: string;
  origin_partner_id?: string;
  error?: string;
  issues?: unknown;
}

export interface SimulatorOptions {
  /** URL base do endpoint (default: relativo → servidor atual). */
  baseUrl?: string;
  /** Permite injetar fetch (testes). */
  fetchImpl?: typeof fetch;
}

/**
 * Gera um payload de RFQ no formato esperado por `/api/public/ecosystem/quotes`
 * para um parceiro. Os itens são escolhidos do catálogo e estão sempre no
 * formato genérico de marketplace (sku/quantity/target_price).
 */
export function buildExternalQuotePayload(
  partnerId: SimulablePartnerId,
  overrides: Partial<{
    external_id: string;
    customer_name: string;
    customer_segment: string;
    skus: string[];
    quantities: number[];
  }> = {},
): Record<string, unknown> {
  const customers: Record<SimulablePartnerId, { name: string; segment: string }> = {
    bionexo: { name: "Hospital Santa Clara", segment: "Hospital privado" },
    apoio: { name: "Clínica São Lucas", segment: "Clínica" },
    marketplace_demo: { name: "Central de Compras RS", segment: "Distribuidor" },
  };
  const catalog: Record<string, { sku: string; name: string; target_price: number }> = {
    "SUT-3-0-CT": { sku: "SUT-3-0-CT", name: "Fio de Sutura 3-0 c/ Agulha", target_price: 27.9 },
    "LUV-CIR-M": { sku: "LUV-CIR-M", name: "Luva Cirúrgica Estéril M", target_price: 3.2 },
    "GZE-EST-10": { sku: "GZE-EST-10", name: "Gaze Estéril 10x10cm", target_price: 1.9 },
    "SER-20ML": { sku: "SER-20ML", name: "Seringa 20ml Descartável", target_price: 1.4 },
  };
  const skus = overrides.skus?.length ? overrides.skus : ["SUT-3-0-CT", "GZE-EST-10"];
  const customer = customers[partnerId];

  return {
    partner_id: partnerId,
    external_id:
      overrides.external_id ?? `RFQ-${partnerId.toUpperCase()}-${Date.now().toString().slice(-6)}`,
    customer: {
      name: overrides.customer_name ?? customer.name,
      segment: overrides.customer_segment ?? customer.segment,
    },
    items: skus.map((sku, i) => {
      const p = catalog[sku] ?? { sku, name: sku, target_price: 10 };
      const qty = overrides.quantities?.[i] ?? 10 + i * 5;
      return {
        sku: p.sku,
        name: p.name,
        quantity: qty,
        target_price: p.target_price,
      };
    }),
    metadata: {
      simulated: true,
      partner: partnerId,
      tz: "America/Sao_Paulo",
    },
  };
}

/**
 * Envia uma RFQ simulada para a Ecosystem API e retorna a resposta tipada.
 * Usa o `origin` atual na baseUrl para funcionar em preview/dev e testes.
 */
export async function sendSimulatedQuote(
  partnerId: SimulablePartnerId,
  options: SimulatorOptions = {},
): Promise<EcosystemQuoteResponse> {
  const payload = buildExternalQuotePayload(partnerId);
  if (!getPartner(partnerId)) {
    return { ok: false, error: `Parceiro desconhecido: ${partnerId}` };
  }

  const fetchImpl = options.fetchImpl ?? fetch;
  const body = JSON.stringify(payload);
  const signature = signForPartner(partnerId, body);
  if (!signature) {
    return { ok: false, error: "Falha ao assinar payload (secret indisponível)" };
  }

  try {
    const res = await fetchImpl(`${options.baseUrl ?? ""}/api/public/ecosystem/quotes`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-partner-signature": signature,
      },
      body,
    });
    const json = (await res.json().catch(() => null)) as EcosystemQuoteResponse | null;
    if (!json) {
      return { ok: false, error: `Resposta inválida (HTTP ${res.status})` };
    }
    return { ...json, ok: json.ok ?? res.ok };
  } catch (err) {
    return {
      ok: false,
      error: `Falha de rede: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

/**
 * Monta uma Quote local (a partir do mesmo adaptador Bionexo usado pela rota
 * server) para o simulador. Em dev, o endpoint não persiste — então o sandbox
 * usa esse helper para criar a cotação na inbox via `ingestPortalQuote`.
 *
 * Retorna `null` se o payload não converter.
 */
export function buildLocalQuoteFromSimulation(
  partnerId: SimulablePartnerId,
  overrides: Parameters<typeof buildExternalQuotePayload>[1] = {},
): Quote | null {
  const payload = buildExternalQuotePayload(partnerId, overrides);
  const converted = bionexoToQuote(
    {
      id: String(payload.external_id),
      hospital: {
        nome: (payload.customer as { name: string }).name,
        segmento: (payload.customer as { segment: string }).segment,
      },
      itens: ((payload.items as Array<{ sku: string; name?: string; quantity: number }>) ?? []).map(
        (it) => ({
          codigo: it.sku,
          descricao: it.name ?? it.sku,
          quantidade: it.quantity,
          preco_alvo: undefined,
        }),
      ),
    },
    {
      tenantId: TENANT.id,
      ownerId: OWNERS[0].id,
      partnerId,
    },
  );
  return converted.ok && converted.quote ? converted.quote : null;
}

export { devPartnerSecret };
