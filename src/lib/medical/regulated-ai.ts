// Stub da IA regulada (Fase 2). A chamada real usará Lovable AI Gateway
// quando Cloud for ativado. Aqui apenas o contrato + fallback determinístico.

import type { Quote } from "./types";
import { checkQuote } from "./compliance";
import { quoteTotals, suggestPrice } from "./pricing";
import { cmedCeiling } from "./compliance";

export interface RegulatedSuggestion {
  sku: string;
  suggested_price: number;
  cmed_ceiling?: number;
  rationale: string;
  risk: "low" | "medium" | "high";
}

export interface RegulatedResponse {
  quote_id: string;
  overall_risk: "low" | "medium" | "high";
  suggestions: RegulatedSuggestion[];
  narrative: string;
}

export function regulatedSuggest(quote: Quote): RegulatedResponse {
  const compliance = checkQuote(quote);
  const suggestions: RegulatedSuggestion[] = quote.items.map((it) => {
    const ceiling = cmedCeiling(it.sku);
    let sugg = suggestPrice(it);
    if (ceiling && sugg > ceiling) sugg = Math.min(sugg, ceiling * 0.98);
    const check = compliance.checks.find((c) => c.sku === it.sku);
    const risk: RegulatedSuggestion["risk"] = check?.status === "blocked" ? "high" : check?.status === "warning" ? "medium" : "low";
    return {
      sku: it.sku,
      suggested_price: Math.round(sugg * 100) / 100,
      cmed_ceiling: ceiling,
      rationale: ceiling ? `Ajustado sob teto CMED PMC ${ceiling.toFixed(2)}` : "Sem teto CMED aplicável",
      risk,
    };
  });
  const { margin } = quoteTotals(quote.items);
  const overall_risk =
    compliance.status === "blocked" || margin < 0.1 ? "high" : compliance.status === "warning" || margin < 0.18 ? "medium" : "low";
  return {
    quote_id: quote.id,
    overall_risk,
    suggestions,
    narrative: `Análise ${overall_risk.toUpperCase()}: ${compliance.summary}. Margem consolidada ${(margin * 100).toFixed(1)}%.`,
  };
}
