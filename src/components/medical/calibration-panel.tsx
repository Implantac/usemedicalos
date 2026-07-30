import { useMemo } from "react";
import { ArrowDown, ArrowUp, Minus, Target } from "lucide-react";
import { computePricingCalibration } from "@/lib/medical/pricing-calibration";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { cn } from "@/lib/utils";

export function CalibrationPanel() {
  const { quotes } = useQuotes();
  const { tenant } = useActiveTenant();
  const { config } = useTenantConfig(tenant?.id);

  const rows = useMemo(
    () =>
      computePricingCalibration(quotes, PRODUCTS, {
        minMargin: config.min_margin,
        targetMargin: config.target_margin,
      }),
    [quotes, config.min_margin, config.target_margin],
  );

  return (
    <div className="rounded-lg border bg-card card-shadow">
      <header className="flex items-start gap-3 border-b px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
          <Target className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold tracking-tight text-foreground">
            Calibração do motor de precificação
          </h2>
          <p className="text-[11px] text-muted-foreground">
            Diferença entre preço sugerido pelo motor e preço real de fechamento
            (quotes ganhas). Base para ajustar `market_avg` e `target_margin`.
          </p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted-foreground">
          Nenhuma cotação ganha ainda. O motor calibra automaticamente conforme
          fechamentos entram.
        </div>
      ) : (
        <ul className="divide-y">
          {rows.slice(0, 10).map((r) => {
            const pct = (r.median_delta * 100).toFixed(1);
            const Icon = r.bias === "under" ? ArrowUp : r.bias === "over" ? ArrowDown : Minus;
            return (
              <li key={r.sku} className="grid grid-cols-[1fr,auto,auto] items-center gap-3 px-4 py-2.5 text-xs">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{r.name}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{r.suggested_action}</div>
                </div>
                <div className="text-right text-[11px] text-muted-foreground tabular-nums">
                  {r.samples} amostra{r.samples > 1 ? "s" : ""}
                </div>
                <div
                  className={cn(
                    "flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                    r.bias === "under" && "bg-success/10 text-success",
                    r.bias === "over" && "bg-destructive/10 text-destructive",
                    r.bias === "aligned" && "bg-muted text-muted-foreground",
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {r.bias === "aligned" ? "OK" : `${r.median_delta > 0 ? "+" : ""}${pct}%`}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
