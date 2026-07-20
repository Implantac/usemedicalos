// Motor de Precificação Inteligente — USE Medical
// Hierarquia de 4 camadas: Floor → Compliance Cap → Market Alignment → Strategic Margin.
// Determinístico e testável. Roda 100% no cliente enquanto estamos no mock;
// migra 1:1 para uma edge function quando Lovable Cloud for ativado.

import type { ClientTier, Product } from "./types";
import { CLIENT_TIER_DISCOUNT } from "./types";

export type PricingStatus =
  | "OPTIMAL"           // Camada 3+4 aplicadas com sucesso
  | "MARKET_MISSING"    // Sem market_avg → caiu no floor com markup técnico
  | "WARNING"           // Ajustado para o floor (margem abaixo do mínimo)
  | "COMPLIANCE_LIMIT"  // Bateu no teto CMED
  | "BLOCKED";          // Floor > CMED (produto não é comercialmente viável)

export interface PricingBreakdown {
  floor_price: number;         // Camada 1
  compliance_cap?: number;     // Camada 2
  market_target?: number;      // Camada 3 (market_avg * 0.98)
  tier_discount: number;       // Camada 4 (fração)
  suggested_price: number;
  status: PricingStatus;
  reason: string;
  margin: number;              // margem final sobre preço sugerido
}

const DEFAULT_MIN_TECHNICAL_MARGIN = 0.05; // fallback quando o tenant não define
const DEFAULT_TARGET_MARGIN = 0.30; // markup técnico quando não há preço de mercado
const DEFAULT_LOGISTICS_RATE = 0.03;
const MARKET_UNDERCUT = 0.02; // "bate mercado com 2% de desconto"

/**
 * Motor de Precificação Inteligente
 * @param product - produto com cost_price, tax_rate, cmed_ceiling, market_avg
 * @param opts.tier - tier do cliente (A/B/C) para desconto estratégico
 * @param opts.quantity - volume, para futura escala de desconto
 * @param opts.minMargin - piso técnico do tenant (fração 0..1); default 5%
 */
export function calculateSuggestedPrice(
  product: Pick<Product, "cost_price" | "tax_rate" | "logistics_rate" | "cmed_ceiling" | "market_avg">,
  opts: { tier?: ClientTier; quantity?: number; minMargin?: number } = {},
): PricingBreakdown {
  const logistics = product.logistics_rate ?? DEFAULT_LOGISTICS_RATE;
  const minMargin = opts.minMargin ?? DEFAULT_MIN_TECHNICAL_MARGIN;

  // ---------- Camada 1: Floor Price ----------
  const loadedCost = product.cost_price * (1 + product.tax_rate + logistics);
  const floor = round2(loadedCost * (1 + minMargin));

  // ---------- Camada 2: Compliance Cap ----------
  const cap = product.cmed_ceiling;

  // Caso patológico: floor > cap → não é possível vender legalmente com margem mínima
  if (cap != null && floor > cap) {
    return {
      floor_price: floor,
      compliance_cap: cap,
      tier_discount: 0,
      suggested_price: cap,
      status: "BLOCKED",
      reason: `Custo carregado (${floor.toFixed(2)}) excede teto CMED (${cap.toFixed(2)}). Reveja custo ou negocie exceção regulatória.`,
      margin: (cap - loadedCost) / cap,
    };
  }

  // ---------- Camada 3: Market Alignment ----------
  let base: number;
  let statusHint: PricingStatus = "OPTIMAL";
  let reason = "Margem ideal calculada.";
  let marketTarget: number | undefined;

  if (product.market_avg && product.market_avg > 0) {
    marketTarget = round2(product.market_avg * (1 - MARKET_UNDERCUT));
    base = marketTarget;
  } else {
    // Fallback: sem inteligência de mercado, aplica markup de 30% sobre o floor
    base = round2(floor * 1.3);
    statusHint = "MARKET_MISSING";
    reason = "Sem preço médio de mercado. Usando markup técnico de 30% sobre o floor.";
  }

  // ---------- Camada 4: Strategic Margin (tier) ----------
  const tierDiscount = opts.tier ? CLIENT_TIER_DISCOUNT[opts.tier] : 0;
  let suggested = round2(base * (1 - tierDiscount));

  // ---------- Validações de segurança ----------
  let status: PricingStatus = statusHint;

  if (suggested < floor) {
    suggested = floor;
    status = "WARNING";
    reason = "Margem abaixo do mínimo técnico. Preço ajustado para o Floor.";
  }

  if (cap != null && suggested > cap) {
    suggested = cap;
    status = "COMPLIANCE_LIMIT";
    reason = `Preço excede teto CMED (${cap.toFixed(2)}). Ajustado para o limite legal.`;
  }

  return {
    floor_price: floor,
    compliance_cap: cap,
    market_target: marketTarget,
    tier_discount: tierDiscount,
    suggested_price: suggested,
    status,
    reason,
    margin: (suggested - loadedCost) / suggested,
  };
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

export const PRICING_STATUS_LABEL: Record<PricingStatus, string> = {
  OPTIMAL: "Ótimo",
  MARKET_MISSING: "Sem benchmark",
  WARNING: "Ajustado ao floor",
  COMPLIANCE_LIMIT: "Teto CMED",
  BLOCKED: "Bloqueado",
};
