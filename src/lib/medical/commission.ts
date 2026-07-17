import type { Quote } from "./types";
import { quoteTotals } from "./pricing";

export interface CommissionTier {
  min_margin: number; // inclusive
  rate: number; // fraction over revenue
}

export interface CommissionRule {
  tiers: CommissionTier[];
  sla_bonus_rate: number; // extra over revenue when SLA is met
  won_bonus_rate: number; // extra when status = ganho
}

export const DEFAULT_RULE: CommissionRule = {
  tiers: [
    { min_margin: 0.30, rate: 0.05 },
    { min_margin: 0.20, rate: 0.035 },
    { min_margin: 0.12, rate: 0.02 },
    { min_margin: 0, rate: 0 },
  ],
  sla_bonus_rate: 0.005,
  won_bonus_rate: 0.005,
};

export interface CommissionResult {
  revenue: number;
  margin: number;
  base_rate: number;
  sla_bonus: number;
  won_bonus: number;
  effective_rate: number;
  total: number;
  tier_label: string;
}

export function rateForMargin(margin: number, rule: CommissionRule = DEFAULT_RULE): number {
  const tier = [...rule.tiers].sort((a, b) => b.min_margin - a.min_margin).find((t) => margin >= t.min_margin);
  return tier?.rate ?? 0;
}

export function tierLabel(rate: number): string {
  if (rate >= 0.05) return "Ouro";
  if (rate >= 0.035) return "Prata";
  if (rate >= 0.02) return "Bronze";
  return "Sem comissão";
}

export function computeCommission(quote: Quote, rule: CommissionRule = DEFAULT_RULE): CommissionResult {
  const { revenue, margin } = quoteTotals(quote.items);
  const base_rate = rateForMargin(margin, rule);
  const slaMet = new Date(quote.sla_deadline).getTime() > Date.now();
  const sla_bonus = base_rate > 0 && slaMet ? rule.sla_bonus_rate : 0;
  const won_bonus = base_rate > 0 && quote.status === "ganho" ? rule.won_bonus_rate : 0;
  const effective_rate = base_rate + sla_bonus + won_bonus;
  return {
    revenue,
    margin,
    base_rate,
    sla_bonus,
    won_bonus,
    effective_rate,
    total: revenue * effective_rate,
    tier_label: tierLabel(base_rate),
  };
}

export interface OwnerCommissionSummary {
  mtd_total: number;
  mtd_won: number;
  mtd_pipeline: number;
  quote_count: number;
  daily_goal: number;
  daily_progress: number;
}

export function summarizeForOwner(
  quotes: Quote[],
  dailyGoal = 1500,
  rule: CommissionRule = DEFAULT_RULE,
): OwnerCommissionSummary {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  let mtd_total = 0;
  let mtd_won = 0;
  let mtd_pipeline = 0;
  let daily_progress = 0;
  for (const q of quotes) {
    const ts = new Date(q.received_at).getTime();
    if (ts < monthStart) continue;
    const c = computeCommission(q, rule);
    mtd_total += c.total;
    if (q.status === "ganho") mtd_won += c.total;
    else if (q.status !== "perdido") mtd_pipeline += c.total;
    if (ts >= dayStart) daily_progress += c.total;
  }
  return {
    mtd_total,
    mtd_won,
    mtd_pipeline,
    quote_count: quotes.filter((q) => new Date(q.received_at).getTime() >= monthStart).length,
    daily_goal: dailyGoal,
    daily_progress,
  };
}
