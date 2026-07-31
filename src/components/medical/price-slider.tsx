/**
 * Price Slider — USE Medical
 *
 * O preço não é uma caixa simples: ao editar, o vendedor vê o impacto
 * em margem e na chance estimada de vitória, além de cenários alternativos.
 */

import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { formatBRL, formatPct } from "@/lib/medical/pricing";

interface Props {
  value: number;
  costPrice: number;
  minMargin: number;
  suggestedPrice: number;
  onChange: (v: number) => void;
}

function marginOf(price: number, cost: number): number {
  if (price <= 0) return 0;
  return (price - cost) / price;
}

/** Heurística determinística: quanto mais acima da sugestão, menor a chance. */
export function winChance(price: number, suggested: number): number {
  if (suggested <= 0 || price <= 0) return 0.5;
  const delta = price / suggested - 1;
  return Math.max(0.05, Math.min(0.97, 0.84 - delta * 3));
}

export function PriceSlider({ value, costPrice, minMargin, suggestedPrice, onChange }: Props) {
  const [open, setOpen] = useState(false);

  const scenarios = useMemo(() => {
    const base = suggestedPrice > 0 ? suggestedPrice : value || costPrice * 1.3;
    return [
      { label: "Agressivo", price: Math.round(base * 0.97 * 100) / 100 },
      { label: "Sugerido IA", price: Math.round(base * 100) / 100 },
      { label: "Margem alta", price: Math.round(base * 1.04 * 100) / 100 },
    ];
  }, [suggestedPrice, value, costPrice]);

  const margin = marginOf(value, costPrice);
  const marginOk = margin >= minMargin;

  return (
    <div className="relative w-full">
      <Input
        type="number"
        step="0.01"
        min={0}
        value={value}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className={cn(
          "h-8 w-full text-right num text-sm",
          marginOk ? "border-border" : "border-danger/50 text-danger",
        )}
      />

      {open && (
        <div className="absolute right-0 top-9 z-30 w-56 rounded-lg border bg-popover p-2 shadow-lg">
          <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> Cenários de preço
          </div>
          <div className="space-y-1">
            {scenarios.map((s) => {
              const m = marginOf(s.price, costPrice);
              const chance = winChance(s.price, suggestedPrice || s.price);
              const active = Math.abs(s.price - value) < 0.005;
              return (
                <button
                  key={s.label}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => onChange(s.price)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left transition-colors",
                    active
                      ? "border-primary/50 bg-primary/5"
                      : "border-border hover:bg-accent/50",
                  )}
                >
                  <div>
                    <div className="num text-xs font-bold text-foreground">
                      {formatBRL(s.price)}
                    </div>
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                      {s.label}
                    </div>
                  </div>
                  <div className="text-right">
                    <div
                      className={cn(
                        "num text-[11px] font-semibold",
                        m >= minMargin ? "text-success" : "text-danger",
                      )}
                    >
                      {formatPct(m)}
                    </div>
                    <div className="num text-[9px] text-muted-foreground">
                      {Math.round(chance * 100)}% chance
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="mt-1.5 text-[9px] text-muted-foreground">
            Custo {formatBRL(costPrice)} · margem mínima {formatPct(minMargin)}
          </p>
        </div>
      )}
    </div>
  );
}
