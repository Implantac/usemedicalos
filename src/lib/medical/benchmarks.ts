// Data Flywheel (Fase 2): benchmarks anonimizados por região/segmento.
// Base sintética determinística — quando Cloud for ativado, alimentado por
// agregações da tabela `market_benchmarks` (nunca por dados nominais).

import type { Quote } from "./types";
import { quoteTotals } from "./pricing";
import { ownerById } from "./mock-data";

export type Region = "SP Capital" | "SP Interior" | "RJ/ES" | "Sul" | "Nordeste";

export interface RegionBenchmark {
  region: Region;
  avgMargin: number;   // 0..1
  avgTicket: number;   // BRL
  winRate: number;     // 0..1
  respHours: number;   // média de primeira resposta
  sampleSize: number;  // n distribuidores anonimizados
}

// Baseline sintético (representa média de mercado por região — anonimizado)
export const MARKET_BENCHMARKS: RegionBenchmark[] = [
  { region: "SP Capital",  avgMargin: 0.184, avgTicket: 12800, winRate: 0.42, respHours: 6.4, sampleSize: 27 },
  { region: "SP Interior", avgMargin: 0.201, avgTicket:  9450, winRate: 0.48, respHours: 5.1, sampleSize: 19 },
  { region: "RJ/ES",       avgMargin: 0.172, avgTicket: 10200, winRate: 0.39, respHours: 7.8, sampleSize: 15 },
  { region: "Sul",         avgMargin: 0.213, avgTicket:  8900, winRate: 0.51, respHours: 4.9, sampleSize: 22 },
  { region: "Nordeste",    avgMargin: 0.166, avgTicket:  7600, winRate: 0.37, respHours: 9.2, sampleSize: 12 },
];

export function benchmarkFor(region: Region): RegionBenchmark {
  return MARKET_BENCHMARKS.find((b) => b.region === region) ?? MARKET_BENCHMARKS[0];
}

export interface RegionComparison {
  region: Region;
  self: { avgMargin: number; avgTicket: number; winRate: number; sampleSize: number };
  market: RegionBenchmark;
  marginDelta: number;   // pontos percentuais vs mercado
  ticketDelta: number;   // % vs mercado
  winRateDelta: number;  // pontos percentuais vs mercado
}

const CLOSED = ["ganho", "perdido"] as const;

export function compareByRegion(quotes: Quote[]): RegionComparison[] {
  const byRegion = new Map<Region, Quote[]>();
  for (const q of quotes) {
    const region = ownerById(q.owner_id).territory as Region;
    const arr = byRegion.get(region) ?? [];
    arr.push(q);
    byRegion.set(region, arr);
  }
  return MARKET_BENCHMARKS.map((mk) => {
    const list = byRegion.get(mk.region) ?? [];
    const totals = list.map((q) => quoteTotals(q.items));
    const closed = list.filter((q) => (CLOSED as readonly string[]).includes(q.status));
    const won = closed.filter((q) => q.status === "ganho").length;
    const self = {
      avgMargin: totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0,
      avgTicket: totals.length ? totals.reduce((s, t) => s + t.revenue, 0) / totals.length : 0,
      winRate: closed.length ? won / closed.length : 0,
      sampleSize: list.length,
    };
    return {
      region: mk.region,
      self,
      market: mk,
      marginDelta: self.avgMargin - mk.avgMargin,
      ticketDelta: mk.avgTicket ? (self.avgTicket - mk.avgTicket) / mk.avgTicket : 0,
      winRateDelta: self.winRate - mk.winRate,
    };
  });
}

export interface ConsolidatedBenchmark {
  self: { avgMargin: number; avgTicket: number; winRate: number };
  market: { avgMargin: number; avgTicket: number; winRate: number };
  percentile: number; // posição da margem própria no ranking sintético (0..1)
}

export function consolidatedBenchmark(quotes: Quote[]): ConsolidatedBenchmark {
  const totals = quotes.map((q) => quoteTotals(q.items));
  const closed = quotes.filter((q) => (CLOSED as readonly string[]).includes(q.status));
  const won = closed.filter((q) => q.status === "ganho").length;
  const self = {
    avgMargin: totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0,
    avgTicket: totals.length ? totals.reduce((s, t) => s + t.revenue, 0) / totals.length : 0,
    winRate: closed.length ? won / closed.length : 0,
  };
  const market = {
    avgMargin: MARKET_BENCHMARKS.reduce((s, b) => s + b.avgMargin, 0) / MARKET_BENCHMARKS.length,
    avgTicket: MARKET_BENCHMARKS.reduce((s, b) => s + b.avgTicket, 0) / MARKET_BENCHMARKS.length,
    winRate: MARKET_BENCHMARKS.reduce((s, b) => s + b.winRate, 0) / MARKET_BENCHMARKS.length,
  };
  const sorted = [...MARKET_BENCHMARKS.map((b) => b.avgMargin), self.avgMargin].sort((a, b) => a - b);
  const percentile = sorted.indexOf(self.avgMargin) / (sorted.length - 1);
  return { self, market, percentile };
}
