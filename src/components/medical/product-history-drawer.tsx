import { Sparkles, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Product, Quote } from "@/lib/medical/types";
import { priceHistory } from "@/lib/medical/analytics";
import { formatBRL, formatPct, suggestPrice } from "@/lib/medical/pricing";
import { PricingEnginePanel } from "./pricing-engine-panel";
import { ProductGovernanceForm } from "./product-governance-form";
import { useUserRole } from "@/hooks/use-user-role";
import { cn } from "@/lib/utils";

export function ProductHistoryDrawer({
  product,
  quotes,
  onClose,
}: {
  product: Product | null;
  quotes: Quote[];
  onClose: () => void;
}) {
  if (!product) return null;
  const history = priceHistory(quotes, product.id);
  const totalQty = history.reduce((s, h) => s + h.qty, 0);
  const avgPrice = history.length ? history.reduce((s, h) => s + h.price, 0) / history.length : 0;
  const avgMargin = history.length ? history.reduce((s, h) => s + h.margin, 0) / history.length : 0;
  const suggested = suggestPrice({
    product_id: product.id,
    sku: product.sku,
    name: product.name,
    quantity: 10,
    unit_price: product.last_suggested_price,
    cost_price: product.cost_price,
  });

  // Média por segmento
  const bySegment = new Map<string, { qty: number; sumPrice: number; count: number }>();
  for (const h of history) {
    const cur = bySegment.get(h.segment) ?? { qty: 0, sumPrice: 0, count: 0 };
    cur.qty += h.qty;
    cur.sumPrice += h.price;
    cur.count += 1;
    bySegment.set(h.segment, cur);
  }

  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-xl">
        <SheetHeader className="space-y-1 border-b bg-card p-4">
          <div className="min-w-0 pr-8">
            <SheetTitle className="truncate text-base font-bold">{product.name}</SheetTitle>
            <SheetDescription className="text-xs">
              SKU {product.sku} · unidade {product.unit}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <section className="grid grid-cols-2 gap-2 border-b p-4 sm:grid-cols-4">
            <Kpi label="Custo" value={formatBRL(product.cost_price)} />
            <Kpi label="Últ. sugerido" value={formatBRL(product.last_suggested_price)} />
            <Kpi label="Preço médio" value={formatBRL(avgPrice)} />
            <Kpi
              label="Margem média"
              value={formatPct(avgMargin)}
              tone={avgMargin < 0.12 ? "danger" : "success"}
            />
          </section>

          <PricingSection product={product} suggestedLegacy={suggested} totalQty={totalQty} />

          <section className="border-b p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Preço médio por segmento
            </h3>
            <ul className="space-y-1 text-xs">
              {Array.from(bySegment.entries()).map(([seg, s]) => (
                <li key={seg} className="flex items-center justify-between rounded-md bg-muted/40 px-2 py-1.5">
                  <span className="truncate text-foreground">{seg}</span>
                  <span className="num text-muted-foreground">
                    {s.count}× · média {formatBRL(s.sumPrice / s.count)}
                  </span>
                </li>
              ))}
              {bySegment.size === 0 && (
                <li className="text-xs text-muted-foreground">Sem histórico ainda.</li>
              )}
            </ul>
          </section>

          <section className="p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Últimas cotações
            </h3>
            {history.length === 0 ? (
              <p className="text-xs text-muted-foreground">Nenhum registro histórico.</p>
            ) : (
              <div className="overflow-hidden rounded-md border">
                <table className="w-full text-xs">
                  <thead className="border-b bg-muted/40 text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-semibold">Cliente</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Qtd</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Preço</th>
                      <th className="px-2 py-1.5 text-right font-semibold">Margem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {history.map((h) => (
                      <tr key={h.quoteId + h.price}>
                        <td className="px-2 py-1.5">
                          <div className="truncate font-medium">{h.customer}</div>
                          <div className="text-[10px] text-muted-foreground">
                            {new Date(h.date).toLocaleDateString("pt-BR")}
                          </div>
                        </td>
                        <td className="px-2 py-1.5 text-right num">{h.qty}</td>
                        <td className="px-2 py-1.5 text-right num font-semibold">{formatBRL(h.price)}</td>
                        <td className={cn("px-2 py-1.5 text-right num font-semibold", h.margin < 0.12 ? "text-danger" : "text-success")}>
                          {formatPct(h.margin)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Kpi({ label, value, tone = "default" }: { label: string; value: string; tone?: "default" | "success" | "danger" }) {
  const toneCls = { default: "text-foreground", success: "text-success", danger: "text-danger" }[tone];
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className={cn("num text-sm font-bold", toneCls)}>{value}</div>
    </div>
  );
}
