/**
 * Quote Summary Bar — USE Medical
 *
 * Barra de resumo que mostra itens atendidos, valor total, margem, etc.
 * Aparece no topo da tela operacional de cotação.
 */

import { useMemo } from "react";
import {
  CheckCircle2,
  DollarSign,
  Percent,
  Send,
  ShoppingCart,
  Target,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { QuoteItem } from "@/lib/medical/types";
import { itemMargin, itemTotal, formatBRL, formatPct } from "@/lib/medical/pricing";

interface Props {
  items: QuoteItem[];
  selectedItems: Set<number>;
  customerName: string;
  sourceLabel: string;
  onSendProposal: () => void;
  onSelectAll: () => void;
  onSelectRecommended: () => void;
  minMargin: number;
}

export function QuoteSummaryBar({
  items,
  selectedItems,
  customerName,
  sourceLabel,
  onSendProposal,
  onSelectAll,
  onSelectRecommended,
  minMargin,
}: Props) {
  const totals = useMemo(() => {
    if (selectedItems.size === 0) {
      return { revenue: 0, cost: 0, margin: 0, items: 0 };
    }
    const selected = Array.from(selectedItems).map((idx) => items[idx]);
    const revenue = selected.reduce((s, it) => s + itemTotal(it), 0);
    const cost = selected.reduce((s, it) => s + it.cost_price * it.quantity, 0);
    const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
    return { revenue, cost, margin, items: selectedItems.size };
  }, [items, selectedItems]);

  const totalItems = items.length;
  const canSend = selectedItems.size > 0;
  const marginOk = totals.margin >= minMargin;

  return (
    <div className="rounded-lg border bg-gradient-to-r from-primary/5 via-card to-card p-3 card-shadow">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: customer info */}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-sm font-bold text-foreground">{customerName}</h2>
            <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary">
              {sourceLabel}
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            {totalItems} itens · {selectedItems.size} selecionados
          </p>
        </div>

        {/* Center: totals */}
        <div className="flex flex-wrap items-center gap-4">
          {selectedItems.size > 0 ? (
            <>
              <div className="flex items-center gap-1.5">
                <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Valor
                  </div>
                  <div className="num text-sm font-bold text-foreground">
                    {formatBRL(totals.revenue)}
                  </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Target className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Custo
                  </div>
                  <div className="num text-sm font-medium text-muted-foreground">
                    {formatBRL(totals.cost)}
                  </div>
              </div>
              <div className="flex items-center gap-1.5">
                <Percent className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Margem
                  </div>
                  <div
                    className={cn(
                      "num text-sm font-bold",
                      marginOk ? "text-success" : "text-danger",
                    )}
                  >
                    {formatPct(totals.margin)}
                  </div>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    Lucro
                  </div>
                  <div
                    className={cn(
                      "num text-sm font-bold",
                      totals.revenue - totals.cost > 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {formatBRL(totals.revenue - totals.cost)}
                  </div>
              </div>
            </>
          ) : (
            <span className="text-xs text-muted-foreground">
              Selecione os itens que deseja atender
            </span>
          )}
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            className="h-8 text-xs"
            onClick={onSelectAll}
          >
            Selecionar todos
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={onSelectRecommended}
          >
            Recomendados
          </Button>
          <Button
            size="sm"
            className="h-8 gap-1.5 text-xs"
            disabled={!canSend}
            onClick={onSendProposal}
          >
            <Send className="h-3.5 w-3.5" />
            Enviar proposta
          </Button>
        </div>
    </div>
  );
}
