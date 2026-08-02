// Adaptador Bionexo (Fase 3).
// Transforma payloads do portal Bionexo no shape interno da USE Medical.
// Determinístico e testável — sem dependência de rede.
//
// Formato típico recebido via webhook/marketplace:
// {
//   "id": "BX-2026-0042",
//   "hospital": { "nome": "Hospital Santa Clara", "segmento": "Hospital privado" },
//   "itens": [ { "codigo": "SUT-3-0-CT", "descricao": "Fio de Sutura 3-0", "quantidade": 40, "preco_alvo": 27.9 } ]
// }
//
// TODO(cloud): quando o conector real (browser agent / API oficial) for ativado,
// este adaptador passa a receber o payload oficial autenticado — a conversão é a mesma.

import { buildQuoteFromPayload, type IngestPayload } from "../ingestion";
import type { Quote, SourcePlatform } from "../types";

export interface BionexoPayload {
  id: string;
  hospital: { nome: string; segmento?: string };
  itens: Array<{ codigo: string; descricao?: string; quantidade: number; preco_alvo?: number }>;
}

export interface BionexoAdapterResult {
  ok: boolean;
  payload?: IngestPayload;
  quote?: Quote;
  errors: string[];
}

/** Converte o payload Bionexo em IngestPayload (normalizado). */
export function bionexoToIngestPayload(raw: unknown): BionexoAdapterResult {
  const errors: string[] = [];
  const p = raw as Partial<BionexoPayload>;

  if (!p || typeof p !== "object") {
    return { ok: false, errors: ["Payload Bionexo inválido."] };
  }
  if (!p.id || typeof p.id !== "string") errors.push("Campo obrigatório ausente: id");
  if (!p.hospital?.nome) errors.push("Campo obrigatório ausente: hospital.nome");
  if (!Array.isArray(p.itens) || p.itens.length === 0) errors.push("Nenhum item em itens");

  if (errors.length) return { ok: false, errors };

  const items = (p.itens ?? []).map((it) => ({
    sku: String(it.codigo ?? "").trim(),
    name: String(it.descricao ?? it.codigo ?? "").trim(),
    quantity: Number(it.quantidade ?? 0),
    target_price: it.preco_alvo != null ? Number(it.preco_alvo) : undefined,
  }));

  // Valida itens individualmente
  const itemErrors = items
    .map((it, i) => {
      if (!it.sku) return `Item #${i + 1}: SKU vazio`;
      if (!it.name) return `Item #${i + 1}: descrição vazia`;
      if (!(it.quantity > 0)) return `Item #${i + 1}: quantidade inválida`;
      return null;
    })
    .filter((x): x is string => x !== null);

  if (itemErrors.length) return { ok: false, errors: itemErrors };

  const hospital = p.hospital as { nome: string; segmento?: string };

  const payload: IngestPayload = {
    source_platform: "bionexo",
    portal_reference: String(p.id),
    portal_opened_at: new Date().toISOString(),
    customer_name: String(hospital.nome),
    customer_segment: hospital.segmento ?? "hospital",
    raw_data: raw,
    items,
  };

  return { ok: true, payload, errors: [] };
}

/** Converte payload Bionexo diretamente em uma Quote (origem portal). */
export function bionexoToQuote(
  raw: unknown,
  ctx: { tenantId: string; ownerId: string; partnerId?: string },
): BionexoAdapterResult {
  const converted = bionexoToIngestPayload(raw);
  if (!converted.ok || !converted.payload) return converted;

  const quote = buildQuoteFromPayload(converted.payload, {
    tenantId: ctx.tenantId,
    ownerId: ctx.ownerId,
  });

  if (ctx.partnerId) {
    quote.origin_partner_id = ctx.partnerId;
  }

  return { ok: true, payload: converted.payload, quote, errors: [] };
}

export type { SourcePlatform };

