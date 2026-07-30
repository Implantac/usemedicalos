import { describe, it, expect } from "vitest";
import { compareByRegion, consolidatedBenchmark, MARKET_BENCHMARKS } from "./benchmarks";
import { INITIAL_QUOTES } from "./mock-data";

describe("benchmarks", () => {
  it("cobre todas as regiões cadastradas", () => {
    const rows = compareByRegion(INITIAL_QUOTES);
    expect(rows).toHaveLength(MARKET_BENCHMARKS.length);
  });

  it("produz deltas coerentes vs mercado", () => {
    const rows = compareByRegion(INITIAL_QUOTES);
    for (const r of rows) {
      expect(r.marginDelta).toBeCloseTo(r.self.avgMargin - r.market.avgMargin, 6);
    }
  });

  it("consolidado retorna percentil entre 0 e 1", () => {
    const c = consolidatedBenchmark(INITIAL_QUOTES);
    expect(c.percentile).toBeGreaterThanOrEqual(0);
    expect(c.percentile).toBeLessThanOrEqual(1);
  });
});
