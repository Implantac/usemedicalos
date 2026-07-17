import type { QuoteItem } from "./types";
import { MIN_MARGIN } from "./types";

// Piso comercial simples: custo * 1.25 (margem bruta ~20%).
// Serve como guarda-corpo visual antes da sugestão da IA.
export const BASE_MARKUP = 1.25;
export function basePrice(cost: number): number {
  return Math.round(cost * BASE_MARKUP * 100) / 100;
}

export type PricingSignal = "negative" | "below_base" | "below_min" | "ok";

export function pricingSignal(item: QuoteItem): PricingSignal {
  if (item.unit_price <= 0) return "negative";
  if (item.unit_price < item.cost_price) return "negative";
  if (item.unit_price < basePrice(item.cost_price)) return "below_base";
  if (itemMargin(item) < MIN_MARGIN) return "below_min";
  return "ok";
}


export function itemMargin(item: QuoteItem): number {
  if (!item.unit_price) return 0;
  return (item.unit_price - item.cost_price) / item.unit_price;
}

export function itemTotal(item: QuoteItem): number {
  return item.unit_price * item.quantity;
}

export function itemCost(item: QuoteItem): number {
  return item.cost_price * item.quantity;
}

export function quoteTotals(items: QuoteItem[]) {
  const revenue = items.reduce((s, i) => s + itemTotal(i), 0);
  const cost = items.reduce((s, i) => s + itemCost(i), 0);
  const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
  return { revenue, cost, profit: revenue - cost, margin };
}

// "IA" de sugestão de preço: markup sobre custo para atingir margem-alvo,
// ajustado por sinal histórico (last_suggested_price) e volume.
export function suggestPrice(item: QuoteItem, targetMargin = 0.28): number {
  const base = item.cost_price / (1 - targetMargin);
  const historical = item.unit_price || item.cost_price * 1.35;
  const volumeAdj = item.quantity >= 50 ? 0.97 : item.quantity >= 20 ? 0.99 : 1;
  const blended = (base * 0.7 + historical * 0.3) * volumeAdj;
  return Math.round(blended * 100) / 100;
}

export function isMarginOk(margin: number): boolean {
  return margin >= MIN_MARGIN;
}

export function formatBRL(v: number): string {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function formatPct(v: number): string {
  return `${(v * 100).toFixed(1)}%`;
}
