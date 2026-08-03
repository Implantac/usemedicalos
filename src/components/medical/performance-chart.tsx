import type { TrendPoint } from "@/lib/medical/analytics";
import { formatBRL } from "@/lib/medical/pricing";

/**
 * Gráfico de performance de 30 dias — comissão e receita ganha por dia.
 * Usa divs (mesmo padrão visual do SlaTimeline) para evitar dependências extras.
 */
export function PerformanceChart({ data }: { data: TrendPoint[] }) {
  const maxCommission = Math.max(1, ...data.map((d) => d.commission));
  const maxWon = Math.max(1, ...data.map((d) => d.won));
  const totalCommission = data.reduce((s, d) => s + d.commission, 0);
  return (
    <div className="rounded-lg border bg-card p-3 card-shadow">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
          Performance 30 dias
        </h3>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-primary" />
            Comissão
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2 w-2 rounded-sm bg-success" />
            Ganho
          </span>
        </div>
      </div>
      <div className="flex h-44 items-end gap-1">
        {data.map((d) => (
          <div key={d.day} className="flex flex-1 flex-col items-center gap-1">
            <div className="flex h-36 w-full items-end gap-0.5">
              <div
                className="flex-1 rounded-t bg-primary/80"
                style={{ height: `${(d.commission / maxCommission) * 100}%` }}
                title={`${d.day}: comissão ${formatBRL(d.commission)}`}
              />
              <div
                className="flex-1 rounded-t bg-success/80"
                style={{ height: `${(d.won / maxWon) * 100}%` }}
                title={`${d.day}: ganho ${formatBRL(d.won)}`}
              />
            </div>
            {data.length <= 15 && <span className="text-[9px] text-muted-foreground">{d.day}</span>}
          </div>
        ))}
      </div>
      <div className="mt-2 text-[10px] text-muted-foreground">
        Comissão acumulada no período:{" "}
        <strong className="num text-foreground">{formatBRL(totalCommission)}</strong>
      </div>
    </div>
  );
}
