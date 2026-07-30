import type { Quote, QuoteStatus, SourceType } from "./types";
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
  const avgTicket = quotes.length
    ? totals.reduce((s, t) => s + t.revenue, 0) / quotes.length
    : 0;
  const avgMargin = totals.length
    ? totals.reduce((s, t) => s + t.margin, 0) / totals.length
    : 0;
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
      avgResponseHours: responses.length ? responses.reduce((a, b) => a + b, 0) / responses.length : 0,
      avgMargin: totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0,
      conversion: closed.length ? won.length / closed.length : 0,
      commissionWon,
      commissionPipeline,
    };
  }).sort((a, b) => b.commissionWon + b.commissionPipeline - (a.commissionWon + a.commissionPipeline));
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
