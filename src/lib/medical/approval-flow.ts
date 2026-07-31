import type { QuoteItem } from "./types";

export interface ApprovalSummary {
  items: QuoteItem[];
  revenue: number;
  cost: number;
  margin: number;
}

export function buildApprovalSummary(items: QuoteItem[]): ApprovalSummary {
  const revenue = items.reduce((sum, it) => sum + it.unit_price * it.quantity, 0);
  const cost = items.reduce((sum, it) => sum + it.cost_price * it.quantity, 0);
  const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
  return { items, revenue, cost, margin };
}

export function needsApproval(margin: number, minMargin: number): boolean {
  return margin < minMargin;
}
