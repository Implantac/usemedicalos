// Regional Flywheel (Fase 2): agrega quotes fechadas por região do owner e
// produz um benchmark real anonimizado. Blenda com o baseline sintético via
// média ponderada por sample size.
//
// Anonimização: só expõe agregados (avg, count). Nenhum campo nominal (cliente,
// vendedor) sai desta função.

import type { Quote } from "./types";
import { quoteTotals } from "./pricing";
import { ownerById } from "./mock-data";
import { MARKET_BENCHMARKS, type Region, type RegionBenchmark } from "./benchmarks";

export interface RegionalContribution {
  region: Region;
  ownSample: number;      // n quotes fechadas do tenant naquela região
  ownAvgMargin: number;   // 0..1
  ownAvgTicket: number;
  ownWinRate: number;
  blended: RegionBenchmark; // baseline + próprio, ponderado por sample
}

const CLOSED = new Set(["ganho", "perdido"]);
const MIN_SAMPLE_FOR_BLEND = 3;

export function computeRegionalFlywheel(quotes: Quote[]): RegionalContribution[] {
  const byRegion = new Map<Region, Quote[]>();
  for (const q of quotes) {
    if (!CLOSED.has(q.status)) continue;
    const region = ownerById(q.owner_id).territory as Region;
    const arr = byRegion.get(region) ?? [];
    arr.push(q);
    byRegion.set(region, arr);
  }
  return MARKET_BENCHMARKS.map((baseline) => {
    const list = byRegion.get(baseline.region) ?? [];
    const totals = list.map((q) => quoteTotals(q.items));
    const won = list.filter((q) => q.status === "ganho").length;
    const ownAvgMargin = totals.length ? totals.reduce((s, t) => s + t.margin, 0) / totals.length : 0;
    const ownAvgTicket = totals.length ? totals.reduce((s, t) => s + t.revenue, 0) / totals.length : 0;
    const ownWinRate = list.length ? won / list.length : 0;

    const n = list.length;
    const shouldBlend = n >= MIN_SAMPLE_FOR_BLEND;
    const blended: RegionBenchmark = shouldBlend
      ? {
          region: baseline.region,
          avgMargin: blend(baseline.avgMargin, baseline.sampleSize, ownAvgMargin, n),
          avgTicket: blend(baseline.avgTicket, baseline.sampleSize, ownAvgTicket, n),
          winRate: blend(baseline.winRate, baseline.sampleSize, ownWinRate, n),
          respHours: baseline.respHours,
          sampleSize: baseline.sampleSize + n,
        }
      : baseline;

    return {
      region: baseline.region,
      ownSample: n,
      ownAvgMargin,
      ownAvgTicket,
      ownWinRate,
      blended,
    };
  });
}

function blend(baseVal: number, baseN: number, ownVal: number, ownN: number): number {
  const total = baseN + ownN;
  if (total === 0) return baseVal;
  return (baseVal * baseN + ownVal * ownN) / total;
}
