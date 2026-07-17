import { Coins, Sparkles } from "lucide-react";
import { computeCommission } from "@/lib/medical/commission";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";

interface Props {
  quote: Quote;
  className?: string;
}

export function CommissionBadge({ quote, className }: Props) {
  const c = computeCommission(quote);
  const zero = c.total <= 0;
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-xs",
        zero
          ? "border-danger/30 bg-danger/5 text-danger"
          : "border-success/30 bg-success/10 text-success",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 font-semibold">
        <Coins className="h-3.5 w-3.5" />
        Comissão estimada
        <span className="ml-1 rounded bg-background/60 px-1.5 py-0.5 text-[10px] uppercase text-foreground">
          {c.tier_label}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <span className="num text-[10px] text-muted-foreground">
          {formatPct(c.effective_rate)}
        </span>
        <span className="num text-sm font-bold">{formatBRL(c.total)}</span>
        {c.sla_bonus > 0 && (
          <span className="inline-flex items-center gap-0.5 rounded bg-warning/20 px-1 py-0.5 text-[10px] font-bold text-warning-foreground">
            <Sparkles className="h-2.5 w-2.5" /> SLA
          </span>
        )}
      </div>
    </div>
  );
}
