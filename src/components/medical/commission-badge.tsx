import { Coins, Sparkles, TrendingUp } from "lucide-react";
import { computeCommission } from "@/lib/medical/commission";
import { formatBRL, formatPct, quoteTotals } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";

interface Props {
  quote: Quote;
  className?: string;
  /** "hero" = grande e destacado (default). "compact" = badge inline. */
  variant?: "hero" | "compact";
}

/**
 * Ganchos de cor pela margem (gamificação financeira):
 *   ≥ 15%  → verde  (recompensa)
 *   ≥ 12%  → âmbar  (mínimo aceitável)
 *   < 12%  → vermelho (bloqueio de comissão)
 */
function marginTone(margin: number) {
  if (margin >= 0.15) return "success";
  if (margin >= 0.12) return "warning";
  return "danger";
}

export function CommissionBadge({ quote, className, variant = "hero" }: Props) {
  const c = computeCommission(quote);
  const totals = quoteTotals(quote.items);
  const tone = marginTone(totals.margin);

  if (variant === "compact") {
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
        </div>
        <span className="num text-sm font-bold">{formatBRL(c.total)}</span>
      </div>
    );
  }

  const toneCls =
    tone === "success"
      ? "border-success/40 bg-gradient-to-br from-success/15 via-success/10 to-transparent"
      : tone === "warning"
        ? "border-warning/50 bg-gradient-to-br from-warning/20 via-warning/10 to-transparent"
        : "border-danger/50 bg-gradient-to-br from-danger/15 via-danger/10 to-transparent";

  const amountCls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning-foreground"
        : "text-danger";

  const marginCls = amountCls;

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border-2 p-4 shadow-sm",
        toneCls,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "grid h-9 w-9 place-items-center rounded-full",
              tone === "success"
                ? "bg-success/20 text-success"
                : tone === "warning"
                  ? "bg-warning/30 text-warning-foreground"
                  : "bg-danger/20 text-danger",
            )}
          >
            <Coins className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Comissão estimada
            </div>
            <div className="text-[11px] text-muted-foreground">
              tier <span className="font-semibold text-foreground">{c.tier_label}</span>{" · "}
              taxa <span className="num font-semibold text-foreground">{formatPct(c.effective_rate)}</span>
            </div>
          </div>
        </div>
        {c.sla_bonus > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/25 px-2 py-0.5 text-[10px] font-bold uppercase text-warning-foreground">
            <Sparkles className="h-3 w-3" /> Bônus SLA
          </span>
        )}
      </div>

      <div className="mt-3 flex items-end justify-between gap-3">
        <div className={cn("num text-4xl font-black leading-none tracking-tight", amountCls)}>
          {formatBRL(c.total)}
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
            Margem
          </div>
          <div
            className={cn(
              "num text-2xl font-black leading-none",
              marginCls,
            )}
          >
            {formatPct(totals.margin)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-current/10 pt-2 text-[11px]">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <TrendingUp className="h-3 w-3" /> receita {formatBRL(totals.revenue)}
        </span>
        <span
          className={cn(
            "font-semibold",
            tone === "success"
              ? "text-success"
              : tone === "warning"
                ? "text-warning-foreground"
                : "text-danger",
          )}
        >
          {tone === "success"
            ? "Comissão liberada"
            : tone === "warning"
              ? "Margem no limite mínimo"
              : "Margem insuficiente — sem comissão"}
        </span>
      </div>
    </div>
  );
}
