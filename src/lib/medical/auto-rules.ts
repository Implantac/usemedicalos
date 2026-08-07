// Motor de automação por regras (Melhoria F).
// "se cliente Tier X e margem ≥ Y → responder automaticamente".
// Nível automático: regras determinísticas, avaliáveis client-side.

import type { ClientTier, Quote, QuoteItem } from "./types";

export type AutoRuleAction = "auto_respond" | "elevate" | "notify";

export interface AutoRuleCondition {
  /** Filtro opcional por tier do cliente. Ex.: "A" significa apenas Tier A. */
  clientTier?: ClientTier;
  /** Filtro opcional por segmento (hospital, clínica, distribuidor). */
  segment?: string;
  /** Operador de comparação para margem. "gte" = margem ≥ minMargin; "lt" = margem < minMargin. */
  marginOperator?: "gte" | "lt";
  /** Margem limite (0..1) comparada com marginOperator. */
  minMargin: number;
  /** Valor mínimo do pedido (R$) para liberar a ação. */
  minRevenue?: number;
}

export interface AutoRule {
  id: string;
  name: string;
  description?: string;
  condition: AutoRuleCondition;
  action: AutoRuleAction;
  /** Quando auto_respond: preço sugerido é aplicado automaticamente (markup). */
  autoMarkup?: number;
  enabled: boolean;
}

export interface AutoRuleEvaluation {
  rule: AutoRule;
  matched: boolean;
  reasons: string[];
  /** Margem média do pedido (0..1) avaliada. */
  margin?: number;
  /** Receita total do pedido (R$). */
  revenue?: number;
}

export interface AutoRuleResult {
  evaluations: AutoRuleEvaluation[];
  /** Regras que decidiram responder automaticamente. */
  autoResponded: AutoRuleEvaluation[];
  /** Regras que elevaram o pedido (ex.: para aprovação). */
  elevated: AutoRuleEvaluation[];
  /** Regras que apenas notificaram. */
  notified: AutoRuleEvaluation[];
}

export const DEFAULT_AUTO_RULES: AutoRule[] = [
  {
    id: "auto_tier_a_min20",
    name: "Tier A com margem ≥ 20% responde sozinho",
    description: "Clientes Tier A com margem acima de 20% recebem resposta automática.",
    condition: { clientTier: "A", minMargin: 0.2 },
    action: "auto_respond",
    autoMarkup: 0.2,
    enabled: true,
  },
  {
    id: "elevate_low_margin",
    name: "Margem abaixo do piso eleva para revisão",
    description: "Pedidos com margem abaixo de 12% são elevados para revisão do gestor.",
    condition: { minMargin: 0.12, marginOperator: "lt" },
    action: "elevate",
    enabled: true,
  },
];

/** Margem média (0..1) de uma cotação. */
export function quoteMargin(items: QuoteItem[]): number {
  const cost = items.reduce((s, it) => s + it.cost_price * it.quantity, 0);
  const revenue = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
  return revenue > 0 ? (revenue - cost) / revenue : 0;
}

/** Receita total (R$) de uma cotação. */
export function quoteRevenue(items: QuoteItem[]): number {
  return items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
}

/** Avalia se uma regra se aplica a uma cotação. */
export function evaluateRule(rule: AutoRule, quote: Quote): AutoRuleEvaluation {
  const margin = quoteMargin(quote.items);
  const revenue = quoteRevenue(quote.items);
  const reasons: string[] = [];
  if (rule.condition.clientTier) {
    if (quote.client_tier === rule.condition.clientTier) {
      reasons.push(`tier ${quote.client_tier}`);
    } else {
      reasons.push(`tier ${quote.client_tier ?? "—"} ≠ ${rule.condition.clientTier}`);
    }
  }
  if (rule.condition.segment) {
    if (quote.customer_segment === rule.condition.segment) {
      reasons.push(`segmento ${quote.customer_segment}`);
    } else {
      reasons.push(`segmento ${quote.customer_segment} ≠ ${rule.condition.segment}`);
    }
  }
  const op = rule.condition.marginOperator ?? "gte";
  const marginMatches = op === "lt" ? margin < rule.condition.minMargin : margin >= rule.condition.minMargin;
  reasons.push(`margem ${(margin * 100).toFixed(1)}% ${marginMatches ? (op === "lt" ? "<" : "≥") : (op === "lt" ? "≥" : "<")} ${(rule.condition.minMargin * 100).toFixed(0)}%`);
  if (rule.condition.minRevenue != null) {
    reasons.push(
      `receita ${revenue.toFixed(0)} ${revenue >= rule.condition.minRevenue ? "≥" : "<"} ${rule.condition.minRevenue}`,
    );
  }

  const tierOk = !rule.condition.clientTier || quote.client_tier === rule.condition.clientTier;
  const segmentOk = !rule.condition.segment || quote.customer_segment === rule.condition.segment;
  const marginOk = marginMatches;
  const revenueOk = rule.condition.minRevenue == null || revenue >= rule.condition.minRevenue;
  const matched = rule.enabled && tierOk && segmentOk && marginOk && revenueOk;

  return { rule, matched, reasons, margin, revenue };
}

/** Roda todas as regras habilitadas contra uma cotação. */
export function evaluateAutoRules(rules: AutoRule[], quote: Quote): AutoRuleResult {
  const evaluations = rules.filter((r) => r.enabled).map((r) => evaluateRule(r, quote));
  const autoResponded = evaluations.filter((e) => e.matched && e.rule.action === "auto_respond");
  const elevated = evaluations.filter((e) => e.matched && e.rule.action === "elevate");
  const notified = evaluations.filter((e) => e.matched && e.rule.action === "notify");
  return { evaluations, autoResponded, elevated, notified };
}

/** Decide se a cotação deve ser respondida automaticamente por alguma regra. */
export function shouldAutoRespond(rules: AutoRule[], quote: Quote): boolean {
  return evaluateAutoRules(rules, quote).autoResponded.length > 0;
}
