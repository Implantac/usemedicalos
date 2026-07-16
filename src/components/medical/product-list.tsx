import type { Product, Quote } from "@/lib/medical/types";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { priceHistory } from "@/lib/medical/analytics";
import { cn } from "@/lib/utils";

function Sparkline({ values, className }: { values: number[]; className?: string }) {
  if (values.length === 0) return <div className={cn("text-[10px] text-muted-foreground", className)}>sem histórico</div>;
  const w = 80;
  const h = 24;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / Math.max(1, values.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className={className}>
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth={1.5} />
    </svg>
  );
}

export function ProductList({
  products,
  quotes,
  selectedId,
  onSelect,
}: {
  products: Product[];
  quotes: Quote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border bg-card card-shadow">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/40 text-[10px] uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">Produto</th>
              <th className="px-2 py-2 text-left font-semibold">SKU</th>
              <th className="px-2 py-2 text-right font-semibold">Custo</th>
              <th className="px-2 py-2 text-right font-semibold">Últ. preço</th>
              <th className="px-2 py-2 text-right font-semibold">Markup</th>
              <th className="px-2 py-2 text-right font-semibold">Histórico</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {products.map((p) => {
              const history = priceHistory(quotes, p.id);
              const values = history.slice(0, 8).map((h) => h.price).reverse();
              const markup = p.cost_price > 0 ? (p.last_suggested_price - p.cost_price) / p.cost_price : 0;
              const active = p.id === selectedId;
              return (
                <tr
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className={cn("cursor-pointer hover:bg-accent/40", active && "bg-accent/60")}
                >
                  <td className="px-3 py-2 font-semibold text-foreground">{p.name}</td>
                  <td className="px-2 py-2 num text-muted-foreground">{p.sku}</td>
                  <td className="px-2 py-2 text-right num">{formatBRL(p.cost_price)}</td>
                  <td className="px-2 py-2 text-right num font-semibold">{formatBRL(p.last_suggested_price)}</td>
                  <td className="px-2 py-2 text-right num font-semibold text-success">{formatPct(markup)}</td>
                  <td className="px-2 py-2 text-right">
                    <Sparkline values={values} className="ml-auto text-primary" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
