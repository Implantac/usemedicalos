import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { RegionComparison, ConsolidatedBenchmark } from "@/lib/medical/benchmarks";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";

function Delta({ v, kind }: { v: number; kind: "pp" | "pct" }) {
  const zero = Math.abs(v) < 0.001;
  const up = v > 0;
  const Icon = zero ? Minus : up ? ArrowUp : ArrowDown;
  const tone = zero ? "text-muted-foreground" : up ? "text-success" : "text-destructive";
  const label = kind === "pp" ? `${(v * 100).toFixed(1)}pp` : formatPct(v);
  return (
    <span className={cn("inline-flex items-center gap-0.5 num text-xs font-semibold", tone)}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export function BenchmarkPanel({
  rows,
  consolidated,
}: {
  rows: RegionComparison[];
  consolidated: ConsolidatedBenchmark;
}) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Sua margem média</div>
          <div className="mt-1 text-2xl font-bold num text-foreground">{formatPct(consolidated.self.avgMargin)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Mercado: <span className="num">{formatPct(consolidated.market.avgMargin)}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Ticket médio</div>
          <div className="mt-1 text-2xl font-bold num text-foreground">{formatBRL(consolidated.self.avgTicket)}</div>
          <div className="mt-1 text-xs text-muted-foreground">
            Mercado: <span className="num">{formatBRL(consolidated.market.avgTicket)}</span>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-3 card-shadow">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Percentil da margem</div>
          <div className="mt-1 text-2xl font-bold num text-foreground">
            {(consolidated.percentile * 100).toFixed(0)}º
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded bg-muted">
            <div
              className="h-full bg-primary"
              style={{ width: `${consolidated.percentile * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-3 card-shadow">
        <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Comparativo por região (anonimizado)
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-xs">
            <thead>
              <tr className="border-b text-left text-muted-foreground">
                <th className="py-1.5 pr-2">Região</th>
                <th className="py-1.5 pr-2 text-right">Margem própria</th>
                <th className="py-1.5 pr-2 text-right">Δ margem</th>
                <th className="py-1.5 pr-2 text-right">Ticket próprio</th>
                <th className="py-1.5 pr-2 text-right">Δ ticket</th>
                <th className="py-1.5 pr-2 text-right">Win rate</th>
                <th className="py-1.5 pr-2 text-right">Δ win</th>
                <th className="py-1.5 pr-2 text-right">n</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.region} className="border-b last:border-0">
                  <td className="py-1.5 pr-2 font-medium text-foreground">{r.region}</td>
                  <td className="py-1.5 pr-2 text-right num">{formatPct(r.self.avgMargin)}</td>
                  <td className="py-1.5 pr-2 text-right"><Delta v={r.marginDelta} kind="pp" /></td>
                  <td className="py-1.5 pr-2 text-right num">{formatBRL(r.self.avgTicket)}</td>
                  <td className="py-1.5 pr-2 text-right"><Delta v={r.ticketDelta} kind="pct" /></td>
                  <td className="py-1.5 pr-2 text-right num">{formatPct(r.self.winRate)}</td>
                  <td className="py-1.5 pr-2 text-right"><Delta v={r.winRateDelta} kind="pp" /></td>
                  <td className="py-1.5 pr-2 text-right num text-muted-foreground">
                    {r.self.sampleSize}/{r.market.sampleSize}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Amostras de mercado são agregadas e anonimizadas (LGPD). Nenhum distribuidor individual é identificável.
        </p>
      </div>
    </div>
  );
}
