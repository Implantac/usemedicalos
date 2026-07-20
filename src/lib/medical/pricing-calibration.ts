// Pricing Calibration — mede o desvio entre o preço sugerido pelo motor e
// o preço real de fechamento (quotes com status "ganho"). Fecha o loop do
// flywheel: identifica SKUs onde o motor sistematicamente sub/superprecifica.
//
// Migração Cloud: substituir por materialized view sobre quote_items JOIN
// products, calculando delta a cada trigger de UPDATE quotes.status='ganho'.

import type { Product, Quote } from "./types";
import { calculateSuggestedPrice } from "./pricing-engine";

export type CalibrationBias = "under" | "over" | "aligned";

export interface SkuCalibration {
  sku: string;
  name: string;
  samples: number;
  median_delta: number; // fração: 0.08 = mercado paga 8% acima do sugerido
  bias: CalibrationBias;
  suggested_action: string;
}

// Faixa "aligned": |delta| < 3% → sugestão está no ponto.
const ALIGNED_THRESHOLD = 0.03;

export function computePricingCalibration(
  quotes: Quote[],
  products: Product[],
  opts: { minMargin?: number; targetMargin?: number } = {},
): SkuCalibration[] {
  const bySku = new Map(products.map((p) => [p.sku, p]));
  const deltasBySku = new Map<string, number[]>();

  for (const q of quotes) {
    if (q.status !== "ganho") continue;
    for (const it of q.items) {
      const p = bySku.get(it.sku);
      if (!p) continue;
      const breakdown = calculateSuggestedPrice(p, {
        tier: q.client_tier,
        quantity: it.quantity,
        minMargin: opts.minMargin,
        targetMargin: opts.targetMargin,
      });
      if (breakdown.suggested_price <= 0) continue;
      const delta = (it.unit_price - breakdown.suggested_price) / breakdown.suggested_price;
      const arr = deltasBySku.get(it.sku) ?? [];
      arr.push(delta);
      deltasBySku.set(it.sku, arr);
    }
  }

  const out: SkuCalibration[] = [];
  for (const [sku, deltas] of deltasBySku) {
    if (deltas.length === 0) continue;
    const p = bySku.get(sku);
    if (!p) continue;
    const median = medianOf(deltas);
    const bias: CalibrationBias =
      Math.abs(median) < ALIGNED_THRESHOLD ? "aligned" : median > 0 ? "under" : "over";
    out.push({
      sku,
      name: p.name,
      samples: deltas.length,
      median_delta: median,
      bias,
      suggested_action:
        bias === "aligned"
          ? "Sugestão calibrada — manter."
          : bias === "under"
            ? `Mercado paga ${(median * 100).toFixed(1)}% acima. Subir preço-alvo do SKU.`
            : `Fechamentos ${(Math.abs(median) * 100).toFixed(1)}% abaixo. Revisar custo ou renegociar tier.`,
    });
  }

  // Prioriza maior desvio absoluto e mais amostras.
  out.sort((a, b) => Math.abs(b.median_delta) * b.samples - Math.abs(a.median_delta) * a.samples);
  return out;
}

function medianOf(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
