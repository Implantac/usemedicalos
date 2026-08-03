import { useMemo } from "react";
import { formatBRL, formatPct, itemMargin, itemTotal } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";
import type { QuoteItem } from "@/lib/medical/types";

interface Props {
  selectedItemsCount: number;
  totalItemsCount: number;
  items: QuoteItem[];
  selectedIndices: Set<number>;
}

export function QuoteSummaryBar({ 
  selectedItemsCount, 
  totalItemsCount, 
  items, 
  selectedIndices 
}: Props) {
  const stats = useMemo(() => {
    let revenue = 0;
    let cost = 0;
    
    Array.from(selectedIndices).forEach(idx => {
      const item = items[idx];
      if (item) {
        revenue += itemTotal(item);
        cost += item.cost_price * item.quantity;
      }
    });

    const profit = revenue - cost;
    const margin = revenue > 0 ? profit / revenue : 0;

    return { revenue, cost, profit, margin };
  }, [items, selectedIndices]);

  return (
    <div className="flex items-center gap-6">
      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Itens Selecionados
        </span>
        <span className="text-sm font-bold text-foreground">
          {selectedItemsCount} / {totalItemsCount}
        </span>
      </div>

      <div className="h-8 w-px bg-border" />

      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Receita Bruta
        </span>
        <span className="text-sm font-bold text-foreground">
          {formatBRL(stats.revenue)}
        </span>
      </div>

      <div className="hidden flex-col md:flex">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Lucro Estimado
        </span>
        <span className="text-sm font-bold text-success">
          {formatBRL(stats.profit)}
        </span>
      </div>

      <div className="flex flex-col">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Margem Média
        </span>
        <span className={cn(
          "text-sm font-bold",
          stats.margin >= 0.12 ? "text-success" : "text-danger"
        )}>
          {formatPct(stats.margin)}
        </span>
      </div>
    </div>
  );
}
