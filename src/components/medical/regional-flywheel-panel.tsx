import { useMemo } from "react";
import { Radar, TrendingDown, TrendingUp } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { computeRegionalFlywheel } from "@/lib/medical/regional-flywheel";
import { cn } from "@/lib/utils";

const fmtPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const fmtBrl = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

export function RegionalFlywheelPanel() {
  const { quotes } = useQuotes();
  const rows = useMemo(() => computeRegionalFlywheel(quotes), [quotes]);
  const contributing = rows.filter((r) => r.ownSample > 0);

  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Radar className="h-4 w-4 text-brand" /> Flywheel regional
        </div>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
          agrega fechadas anonimizadas • blend a partir de 3 amostras
        </span>
      </div>
      {contributing.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Ainda sem cotações fechadas para alimentar o flywheel. Feche ao menos 3 quotes por região para
          calibrar os benchmarks com dados reais.
        </p>
      ) : (
        <div className="overflow-hidden rounded border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 text-[10px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-2 py-1.5 text-left">Região</th>
                <th className="px-2 py-1.5 text-right">Fechadas</th>
                <th className="px-2 py-1.5 text-right">Margem própria</th>
                <th className="px-2 py-1.5 text-right">Ticket próprio</th>
                <th className="px-2 py-1.5 text-right">Win rate próprio</th>
                <th className="px-2 py-1.5 text-right">Delta margem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {contributing.map((r) => {
                const delta = r.ownAvgMargin - r.blended.avgMargin;
                const blended = r.ownSample >= 3;
                return (
                  <tr key={r.region} className="hover:bg-muted/30">
                    <td className="px-2 py-1.5 font-semibold text-foreground">
                      {r.region}
                      {blended && (
                        <span className="ml-1 rounded bg-brand/10 px-1 text-[9px] font-bold uppercase text-brand">
                          blend
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right num">{r.ownSample}</td>
                    <td className="px-2 py-1.5 text-right num">{fmtPct(r.ownAvgMargin)}</td>
                    <td className="px-2 py-1.5 text-right num">{fmtBrl(r.ownAvgTicket)}</td>
                    <td className="px-2 py-1.5 text-right num">{fmtPct(r.ownWinRate)}</td>
                    <td className={cn(
                      "px-2 py-1.5 text-right num font-semibold",
                      delta > 0 ? "text-success" : delta < 0 ? "text-destructive" : "text-muted-foreground",
                    )}>
                      <span className="inline-flex items-center gap-1">
                        {delta > 0 ? <TrendingUp className="h-3 w-3" /> : delta < 0 ? <TrendingDown className="h-3 w-3" /> : null}
                        {(delta * 100).toFixed(1)} pp
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
