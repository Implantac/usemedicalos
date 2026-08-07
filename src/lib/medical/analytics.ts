import type { Quote, QuoteStatus, SourceType } from "./types";
import { MIN_MARGIN } from "./types";
import { OWNERS, ownerById } from "./mock-data";
import { quoteTotals } from "./pricing";
import { computeCommission } from "./commission";
import { slaState } from "@/components/medical/sla-indicator";

export function filterByDays(quotes: Quote[], days: number): Quote[] {
  const cutoff = Date.now() - days * 86_400_000;
  return quotes.filter((q) => new Date(q.received_at).getTime() >= cutoff);
}

export interface Kpis {
  activeCount: number;
  pipeline: number;
  avgTicket: number;
  winRate: number; // 0..1
  avgMargin: number; // 0..1
  slaHealth: number; // 0..1 (% dentro do SLA para não fechadas)
}

const OPEN: QuoteStatus[] = ["aguardando_precificacao", "em_negociacao", "enviado"];
const CLOSED: QuoteStatus[] = ["ganho", "perdido"];

export function computeKpis(quotes: Quote[]): Kpis {
  const active = quotes.filter((q) => OPEN.includes(q.status));
  const closed = quotes.filter((q) => CLOSED.includes(q.status));
  const won = closed.filter((q) => q.status === "ganho");
  const totals = quotes.map((q) => quoteTotals(q.items));
  const pipeline = active.reduce((s, q) => s + quoteTotals(q.items).revenue, 0);
  const avgTicket = quotes.length ? totals.reduce((s, t) => s + t.revenue, 0) / quotes.length : 0;
  const avgMargin = totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0;
  const winRate = closed.length ? won.length / closed.length : 0;
  const openForSla = quotes.filter(
    (q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao",
  );
  const ok = openForSla.filter((q) => slaState(q.sla_deadline).tone === "ok").length;
  const slaHealth = openForSla.length ? ok / openForSla.length : 1;
  return {
    activeCount: active.length,
    pipeline,
    avgTicket,
    winRate,
    avgMargin,
    slaHealth,
  };
}

export interface DailyPoint {
  day: string; // "dd/MM"
  received: number;
  sent: number;
}

export function dailySeries(quotes: Quote[], days: number): DailyPoint[] {
  const out: DailyPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const start = now.getTime() - i * 86_400_000;
    const end = start + 86_400_000;
    const label = new Date(start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    const inDay = quotes.filter((q) => {
      const t = new Date(q.received_at).getTime();
      return t >= start && t < end;
    });
    const received = inDay.length;
    const sent = inDay.filter((q) => q.status !== "aguardando_precificacao").length;
    out.push({ day: label, received, sent });
  }
  return out;
}

export interface TrendPoint {
  day: string; // "dd/MM"
  commission: number;
  won: number;
}

/**
 * Comissão e total ganho por dia (últimos N dias) — para o gráfico de
 * performance de 30 dias do vendedor.
 */
export function performanceTrend(quotes: Quote[], days: number): TrendPoint[] {
  const out: TrendPoint[] = [];
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  for (let i = days - 1; i >= 0; i--) {
    const start = now.getTime() - i * 86_400_000;
    const end = start + 86_400_000;
    const label = new Date(start).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
    let commission = 0;
    let won = 0;
    for (const q of quotes) {
      const t = new Date(q.received_at).getTime();
      if (t < start || t >= end) continue;
      const c = computeCommission(q);
      commission += c.total;
      if (q.status === "ganho") won += quoteTotals(q.items).revenue;
    }
    out.push({ day: label, commission, won });
  }
  return out;
}

export function statusDistribution(quotes: Quote[]) {
  const map = new Map<QuoteStatus, number>();
  for (const q of quotes) map.set(q.status, (map.get(q.status) ?? 0) + 1);
  return Array.from(map.entries()).map(([status, count]) => ({ status, count }));
}

export function sourceDistribution(quotes: Quote[]) {
  const map = new Map<SourceType, number>();
  for (const q of quotes) map.set(q.source_type, (map.get(q.source_type) ?? 0) + 1);
  return Array.from(map.entries()).map(([source, count]) => ({ source, count }));
}

export interface OwnerRow {
  owner: ReturnType<typeof ownerById>;
  count: number;
  pipeline: number;
  avgResponseHours: number;
  avgMargin: number;
  conversion: number; // ganho / fechadas
  commissionWon: number;
  commissionPipeline: number;
}

export function leaderboard(quotes: Quote[]): OwnerRow[] {
  return OWNERS.map((owner) => {
    const mine = quotes.filter((q) => q.owner_id === owner.id);
    const totals = mine.map((q) => quoteTotals(q.items));
    const closed = mine.filter((q) => CLOSED.includes(q.status));
    const won = closed.filter((q) => q.status === "ganho");
    let commissionWon = 0;
    let commissionPipeline = 0;
    for (const q of mine) {
      const c = computeCommission(q);
      if (q.status === "ganho") commissionWon += c.total;
      else if (q.status !== "perdido") commissionPipeline += c.total;
    }
    const now = Date.now();
    const responses = mine.map((q) => {
      const received = new Date(q.received_at).getTime();
      if (q.status === "aguardando_precificacao") return (now - received) / 3_600_000;
      const deadline = new Date(q.sla_deadline).getTime();
      const window = deadline - received;
      return Math.max(0, window * 0.5) / 3_600_000;
    });
    return {
      owner,
      count: mine.length,
      pipeline: mine
        .filter((q) => OPEN.includes(q.status))
        .reduce((s, q) => s + quoteTotals(q.items).revenue, 0),
      avgResponseHours: responses.length
        ? responses.reduce((a, b) => a + b, 0) / responses.length
        : 0,
      avgMargin: totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0,
      conversion: closed.length ? won.length / closed.length : 0,
      commissionWon,
      commissionPipeline,
    };
  }).sort(
    (a, b) => b.commissionWon + b.commissionPipeline - (a.commissionWon + a.commissionPipeline),
  );
}

export function exceptions(quotes: Quote[]): Quote[] {
  return quotes
    .filter((q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao")
    .filter((q) => slaState(q.sla_deadline).tone !== "ok")
    .sort((a, b) => slaState(a.sla_deadline).hours - slaState(b.sla_deadline).hours);
}

// Histórico de preços por produto, extraído das quotes.
export interface PricePoint {
  quoteId: string;
  customer: string;
  segment: string;
  date: string;
  qty: number;
  price: number;
  margin: number;
}

export interface SourceConversion {
  source: SourceType;
  count: number;
  responded: number;
  won: number;
  lost: number;
  responseRate: number; // 0..1
  avgResponseHours: number | null;
  winRate: number; // 0..1 (ganho / fechadas)
}

/**
 * Métricas de conversão por fonte (me lhoria #C):
 * taxa de resposta, prazo médio de resposta e taxa de vitória por fonte.
 */
export function sourceConversion(quotes: Quote[]): SourceConversion[] {
  const bySource = new Map<SourceType, Quote[]>();
  for (const q of quotes) {
    const list = bySource.get(q.source_type) ?? [];
    list.push(q);
    bySource.set(q.source_type, list);
  }
  const now = Date.now();
  const out: SourceConversion[] = [];
  for (const [source, list] of bySource) {
    const responded = list.filter(
      (q) => q.status !== "aguardando_precificacao" && q.status !== "pending_review",
    );
    const closed = list.filter((q) => q.status === "ganho" || q.status === "perdido");
    const won = closed.filter((q) => q.status === "ganho");
    const respHours: (number | null)[] = list.map((q) => {
      const received = new Date(q.received_at).getTime();
      if (q.status === "aguardando_precificacao" || q.status === "pending_review")
        return (now - received) / 3_600_000;
      const deadline = new Date(q.sla_deadline).getTime();
      const window = deadline - received;
      return Math.max(0, window * 0.5) / 3_600_000;
    });
    const positiveHours = respHours.filter((h): h is number => h != null);
    const sumHours = positiveHours.reduce((s, h) => s + (h as number), 0);
    const avgResponseHours = positiveHours.length > 0 ? sumHours / positiveHours.length : null;
    out.push({
      source,
      count: list.length,
      responded: responded.length,
      won: won.length,
      lost: closed.length - won.length,
      responseRate: list.length ? responded.length / list.length : 0,
      avgResponseHours,
      winRate: closed.length ? won.length / closed.length : 0,
    });
  }
  return out.sort((a, b) => b.count - a.count);
}

export interface MarginOnTable {
  totalRevenue: number;
  totalCost: number;
  realizedMargin: number; // 0..1 margem do preço fechado
  suggestedMargin: number; // 0..1 margem do preço sugerido
  marginLeftOnTableBRL: number; // R$ de margem "deixada na mesa" (ganhas + em negociação)
  quoteCount: number;
}

const OPEN_OR_WON: QuoteStatus[] = ["ganho", "enviado", "em_negociacao"];

/**
 * Calcula a margem "deixada na mesa": diferença entre a margem obtida no preço
 * fechado e a margem que o preço sugerido (via pricing) teria entregue (me lhoria #D).
 */
export function marginLeftOnTable(quotes: Quote[]): MarginOnTable {
  let totalRevenue = 0;
  let totalCost = 0;
  let marginLeft = 0;
  let realizedMargin = 0;
  let suggestedMargin = 0;
  for (const q of quotes) {
    if (!OPEN_OR_WON.includes(q.status)) continue;
    for (const it of q.items) {
      totalRevenue += it.unit_price * it.quantity;
      totalCost += it.cost_price * it.quantity;
    }
  }
  // Margem sugerida aproximada por item usando custo + markup padrão (piso de 12%).
  const markup = 1 / (1 - MIN_MARGIN);
  for (const q of quotes) {
    if (!OPEN_OR_WON.includes(q.status)) continue;
    for (const it of q.items) {
      const suggested = it.cost_price > 0 ? it.cost_price * markup : it.unit_price;
      const realizedMarginItem =
        it.unit_price > 0 ? (it.unit_price - it.cost_price) / it.unit_price : 0;
      const suggestedMarginItem =
        suggested > 0 ? (suggested - it.cost_price) / suggested : 0;
      marginLeft += (suggestedMarginItem - realizedMarginItem) * suggested;
    }
  }
  const closed = quotes.filter((q) => q.status === "ganho");
  const closedTotals = closed.map((q) => ({
    revenue: q.items.reduce((s, it) => s + it.unit_price * it.quantity, 0),
    cost: q.items.reduce((s, it) => s + it.cost_price * it.quantity, 0),
  }));
  const realizedRev = closedTotals.reduce((s, t) => s + t.revenue, 0);
  const realizedCost = closedTotals.reduce((s, t) => s + t.cost, 0);
  realizedMargin = realizedRev > 0 ? (realizedRev - realizedCost) / realizedRev : 0;
  // Margem sugerida sobre ganhas
  const suggRev = closed.reduce(
    (s, q) =>
      s +
      q.items.reduce(
        (sum, it) => sum + (it.cost_price > 0 ? it.cost_price * markup : it.unit_price) * it.quantity,
        0,
      ),
    0,
  );
  const suggCost = closed.reduce(
    (s, q) => s + q.items.reduce((sum, it) => sum + it.cost_price * it.quantity, 0),
    0,
  );
  suggestedMargin = suggRev > 0 ? (suggRev - suggCost) / suggRev : 0;
  return {
    totalRevenue,
    totalCost,
    realizedMargin,
    suggestedMargin,
    marginLeftOnTableBRL: Math.max(0, marginLeft),
    quoteCount: quotes.filter((q) => OPEN_OR_WON.includes(q.status)).length,
  };
}

export function priceHistory(quotes: Quote[], productId: string): PricePoint[] {
  const rows: PricePoint[] = [];
  for (const q of quotes) {
    for (const it of q.items) {
      if (it.product_id !== productId) continue;
      const margin = it.unit_price > 0 ? (it.unit_price - it.cost_price) / it.unit_price : 0;
      rows.push({
        quoteId: q.id,
        customer: q.customer_name,
        segment: q.customer_segment,
        date: q.received_at,
        qty: it.quantity,
        price: it.unit_price,
        margin,
      });
    }
  }
  return rows.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export interface TeamRow {
  ownerId: string;
  ownerName: string;
  initialization: string;
  quotes: number;
  pipeline: number;
  wonRevenue: number;
  commissionWon: number;
  winRate: number; // 0..1
}

/**
 * Leaderboard de equipe (Melhoria E): agrega owners por tenant.
 * Cada owner é representado em uma linha com métricas de performance.
 */
export function teamLeaderboard(quotes: Quote[]): TeamRow[] {
  const rows: TeamRow[] = [];
  for (const o of OWNERS) {
    const mine = quotes.filter((q) => q.owner_id === o.id);
    if (mine.length === 0) continue;
    const closed = mine.filter((q) => q.status === "ganho" || q.status === "perdido");
    const won = mine.filter((q) => q.status === "ganho");
    const pipeline = mine
      .filter((q) => OPEN.includes(q.status))
      .reduce((s, q) => s + quoteTotals(q.items).revenue, 0);
    let commissionWon = 0;
    let wonRevenue = 0;
    for (const q of won) {
      commissionWon += computeCommission(q).total;
      wonRevenue += quoteTotals(q.items).revenue;
    }
    rows.push({
      ownerId: o.id,
      ownerName: o.name,
      initialization: o.initials,
      quotes: mine.length,
      pipeline,
      wonRevenue,
      commissionWon,
      winRate: closed.length ? won.length / closed.length : 0,
    });
  }
  return rows.sort(
    (a, b) => b.commissionWon + b.pipeline - (a.commissionWon + a.pipeline),
  );
}
