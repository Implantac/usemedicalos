// Command Center — agregações executivas em tempo real.
// Deriva de quotes + activity log. Mock: opera sobre localStorage.
// TODO(cloud): virar materialized view refreshed a cada 30s.

import type { Quote, QuoteStatus } from "./types";
import { quoteTotals } from "./pricing";
import { slaState } from "@/components/medical/sla-indicator";
import { buildClientProfiles } from "./client-intel";
import type { Activity } from "./activity";

const OPEN: QuoteStatus[] = ["pending_review", "aguardando_precificacao", "em_negociacao", "enviado"];

export interface Opportunities {
  today: number;
  urgent: number;
  expire30min: number;
  expireToday: number;
  potentialValue: number;
  predictedMargin: number; // 0..1
  avgWinChance: number;    // 0..1
  predictedOrders: number; // R$ = potentialValue * avgWinChance
}

function startOfDay(d = new Date()): number {
  const c = new Date(d);
  c.setHours(0, 0, 0, 0);
  return c.getTime();
}

function endOfDay(d = new Date()): number {
  return startOfDay(d) + 86_400_000;
}

export function computeOpportunities(quotes: Quote[]): Opportunities {
  const now = Date.now();
  const dayEnd = endOfDay();
  const dayStart = startOfDay();

  const open = quotes.filter((q) => OPEN.includes(q.status));
  const today = quotes.filter((q) => {
    const t = new Date(q.received_at).getTime();
    return t >= dayStart && t < dayEnd;
  }).length;

  const urgent = open.filter((q) => q.priority === "urgente" || q.priority === "alta").length;

  let expire30min = 0;
  let expireToday = 0;
  for (const q of open) {
    const dl = new Date(q.sla_deadline).getTime();
    const diff = dl - now;
    if (diff > 0 && diff <= 30 * 60_000) expire30min++;
    if (dl >= dayStart && dl < dayEnd) expireToday++;
  }

  const totals = open.map((q) => quoteTotals(q.items));
  const potentialValue = totals.reduce((s, t) => s + t.revenue, 0);
  const predictedMargin = totals.length
    ? totals.reduce((s, t) => s + t.margin, 0) / totals.length
    : 0;

  const profiles = buildClientProfiles(quotes);
  const winChances = open.map((q) => estimateWinChance(q, profiles));
  const avgWinChance = winChances.length
    ? winChances.reduce((a, b) => a + b, 0) / winChances.length
    : 0;
  const predictedOrders = potentialValue * avgWinChance;

  return { today, urgent, expire30min, expireToday, potentialValue, predictedMargin, avgWinChance, predictedOrders };
}

// -------------- IA Comercial: score por cotação --------------

export interface QuoteScore {
  quote: Quote;
  winChance: number;      // 0..1
  expectedProfit: number; // R$
  score: number;
  reason: string;
}

const PRIORITY_BASE: Record<Quote["priority"], number> = {
  urgente: 0.55,
  alta: 0.5,
  normal: 0.42,
  baixa: 0.3,
};

export function estimateWinChance(
  quote: Quote,
  profiles?: Map<string, ReturnType<typeof buildClientProfiles> extends Map<string, infer V> ? V : never>,
): number {
  const key = quote.customer_name.trim().toLowerCase().replace(/\s+/g, " ");
  const p = profiles?.get(key);
  let base = PRIORITY_BASE[quote.priority];
  if (p && p.total_quotes >= 2) {
    // Blend: 60% histórico + 40% baseline por prioridade
    base = p.win_rate * 0.6 + base * 0.4;
  }
  // Ajuste por tier (A paga mais e fecha mais)
  if (quote.client_tier === "A") base += 0.08;
  else if (quote.client_tier === "C") base -= 0.05;
  // SLA saudável = melhor engajamento
  const sla = slaState(quote.sla_deadline);
  if (sla.tone === "danger") base -= 0.1;
  else if (sla.tone === "warning") base -= 0.04;
  // Margem muito baixa = tende a perder pra concorrente ou nem responder
  const totals = quoteTotals(quote.items);
  if (totals.margin < 0.08) base -= 0.08;
  return Math.max(0.02, Math.min(0.97, base));
}

export function scoreQuotes(quotes: Quote[]): QuoteScore[] {
  const profiles = buildClientProfiles(quotes);
  const open = quotes.filter((q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao" || q.status === "pending_review");
  return open
    .map((q) => {
      const totals = quoteTotals(q.items);
      const winChance = estimateWinChance(q, profiles);
      const expectedProfit = totals.revenue * totals.margin * winChance;
      const sla = slaState(q.sla_deadline);
      const urgencyMult = sla.tone === "danger" ? 1.4 : sla.tone === "warning" ? 1.15 : 1;
      const score = expectedProfit * urgencyMult;
      const p = profiles.get(q.customer_name.trim().toLowerCase().replace(/\s+/g, " "));
      const reason = buildReason(q, winChance, totals, p, sla);
      return { quote: q, winChance, expectedProfit, score, reason };
    })
    .sort((a, b) => b.score - a.score);
}

function buildReason(
  q: Quote,
  winChance: number,
  totals: { revenue: number; margin: number },
  profile: { win_rate: number; total_quotes: number; wins: number } | undefined,
  sla: ReturnType<typeof slaState>,
): string {
  const bits: string[] = [];
  if (winChance >= 0.7) bits.push(`chance ${Math.round(winChance * 100)}%`);
  if (profile && profile.wins >= 2) bits.push(`${profile.wins} vitórias com o cliente`);
  if (totals.margin >= 0.18) bits.push(`margem ${Math.round(totals.margin * 100)}%`);
  if (sla.tone === "danger") bits.push("SLA crítico");
  else if (sla.tone === "warning") bits.push("SLA em risco");
  if (q.priority === "urgente") bits.push("urgência marcada");
  return bits.slice(0, 3).join(" · ") || "oportunidade aberta";
}

export function antiRecommendation(quotes: Quote[]): QuoteScore | null {
  const profiles = buildClientProfiles(quotes);
  const open = quotes.filter((q) => q.status === "aguardando_precificacao" || q.status === "em_negociacao");
  let worst: QuoteScore | null = null;
  for (const q of open) {
    const totals = quoteTotals(q.items);
    if (totals.revenue < 500) continue;
    const winChance = estimateWinChance(q, profiles);
    if (winChance > 0.18) continue;
    const p = profiles.get(q.customer_name.trim().toLowerCase().replace(/\s+/g, " "));
    const reason =
      p && p.total_quotes >= 2 && p.win_rate < 0.15
        ? `Histórico: ${p.wins}/${p.total_quotes} vitórias com o cliente`
        : totals.margin < 0.08
        ? "Margem inviável — provável perda"
        : "Baixa probabilidade de vitória";
    const cand: QuoteScore = {
      quote: q,
      winChance,
      expectedProfit: totals.revenue * totals.margin * winChance,
      score: winChance,
      reason,
    };
    if (!worst || cand.winChance < worst.winChance) worst = cand;
  }
  return worst;
}

// -------------- Radar (funil hoje) --------------

export interface RadarSnapshot {
  novas: number;
  respondidas: number;
  negociacao: number;
  enviadas: number;
  ganhas: number;
  perdidas: number;
}

export function computeRadar(quotes: Quote[]): RadarSnapshot {
  const dayStart = startOfDay();
  const dayEnd = endOfDay();
  const inToday = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= dayStart && t < dayEnd;
  };
  const novas = quotes.filter((q) => inToday(q.received_at)).length;
  const negociacao = quotes.filter((q) => q.status === "em_negociacao").length;
  const enviadas = quotes.filter((q) => q.status === "enviado").length;
  const ganhas = quotes.filter((q) => q.status === "ganho" && inToday(q.received_at)).length;
  const perdidas = quotes.filter((q) => q.status === "perdido" && inToday(q.received_at)).length;
  // "Respondidas" = qualquer status pós-aguardando dentro do dia
  const respondidas = quotes.filter(
    (q) =>
      inToday(q.received_at) &&
      q.status !== "aguardando_precificacao" &&
      q.status !== "pending_review",
  ).length;
  return { novas, respondidas, negociacao, enviadas, ganhas, perdidas };
}

// -------------- Timeline --------------

export function recentTimeline(activities: Activity[], limit = 12): Activity[] {
  return activities.slice(0, limit);
}
