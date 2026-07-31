/**
 * Product History Panel — USE Medical
 *
 * Painel de histórico comercial completo de um produto.
 * Exibido inline na tela de Cotação Operacional ao clicar em um item.
 */

import { useMemo } from "react";
import {
  BarChart3,
  Clock,
  DollarSign,
  Package,
  Percent,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";
import type { MatchedProduct } from "@/lib/medical/product-matching";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { buildProductHistory } from "@/lib/medical/product-history";

const MATCH_METHOD_LABEL: Record<MatchedProduct["matchMethod"], string> = {
  ean: "EAN / GTIN",
  sku: "SKU",
  manufacturer_ref: "Ref. Fabricante",
  fuzzy_name: "Descrição",
  not_found: "Não localizado",
};

interface Props {
  sku: string;
  productName: string;
  currentPrice: number;
  matched: MatchedProduct | null;
  allQuotes: Quote[];
  onClose: () => void;
}

export function ProductHistoryPanel({ sku, productName, currentPrice, matched, allQuotes, onClose }: Props) {
  const history = useMemo(
    () => buildProductHistory(sku, productName, allQuotes),
    [sku, productName, allQuotes],
  );

  const { intelligence, lastSale, recentSales, quoteHistory } = history;
  const priceDelta = intelligence.recommendationPrice > 0
    ? (currentPrice - intelligence.recommendationPrice) / intelligence.recommendationPrice
    : 0;

  return (
    <div className="rounded-lg border bg-card shadow-lg animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between border-b p-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Package className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">{productName}</h3>
            <p className="text-[10px] text-muted-foreground num">SKU {sku}</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-b px-3 py-3">
        <div className="flex flex-col gap-2 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-primary">
              Método: {matched ? MATCH_METHOD_LABEL[matched.matchMethod] : "Não localizado"}
            </span>
            <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-1 text-emerald-700">
              Confiança: {matched?.confidence ?? "low"}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "rounded-full px-2 py-1 text-[11px] font-semibold",
              matched?.erpConfirmed ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-amber-50 text-amber-700 border border-amber-100",
            )}>
              {matched?.erpConfirmed ? "ERP confirmado" : "ERP pendente"}
            </span>
            {matched && matched.matchMethod !== "not_found" && (
              <>
                <span className="rounded-full border border-muted-foreground/20 bg-muted/10 px-2 py-1 text-muted-foreground">
                  Produto ERP: {matched.product.name}
                </span>
                <span className="rounded-full border border-muted-foreground/20 bg-muted/10 px-2 py-1 text-muted-foreground">
                  ERP SKU: {matched.product.sku}
                </span>
                <span className="rounded-full border border-muted-foreground/20 bg-muted/10 px-2 py-1 text-muted-foreground">
                  ERP ID: {matched.product.id}
                </span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 p-3 sm:grid-cols-2">
        {/* Last sale */}
        <div className="rounded-md border bg-muted/30 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <Clock className="h-3 w-3" /> Última venda
          </div>
          {lastSale ? (
            <div className="space-y-1">
              <Row label="Preço" value={formatBRL(lastSale.price)} />
              <Row label="Quantidade" value={String(lastSale.quantity)} />
              <Row label="Cliente" value={lastSale.customerName} />
              <Row
                label="Data"
                value={new Date(lastSale.date).toLocaleDateString("pt-BR")}
              />
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Nenhuma venda registrada.</p>
          )}
        </div>

        {/* Quote history */}
        <div className="rounded-md border bg-muted/30 p-2.5">
          <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            <BarChart3 className="h-3 w-3" /> Histórico de cotações
          </div>
          <div className="space-y-1">
            <Row label="Recebidas" value={String(quoteHistory.received)} />
            <Row label="Respondidas" value={String(quoteHistory.responded)} />
            <Row label="Ganhas" value={String(quoteHistory.won)} tone="text-success" />
            <Row label="Perdidas" value={String(quoteHistory.lost)} tone="text-danger" />
          </div>
        </div>

        {/* Intelligence */}
        <div className="rounded-md border bg-gradient-to-br from-primary/5 to-card p-2.5 sm:col-span-2">
          <div className="mb-2 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary">
            <TrendingUp className="h-3 w-3" /> Inteligência de Produto
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <IntelCard
              icon={TrendingUp}
              label="Tendência de preço"
              value={
                intelligence.priceTrend > 0
                  ? `Subiu ${formatPct(Math.abs(intelligence.priceTrend))}`
                  : intelligence.priceTrend < 0
                    ? `Caiu ${formatPct(Math.abs(intelligence.priceTrend))}`
                    : "Estável"
              }
              tone={
                intelligence.priceTrend > 0
                  ? "text-success"
                  : intelligence.priceTrend < 0
                    ? "text-danger"
                    : "text-muted-foreground"
              }
            />
            <IntelCard
              icon={Target}
              label="Taxa de vitória"
              value={formatPct(intelligence.winRate)}
              tone={intelligence.winRate >= 0.5 ? "text-success" : "text-warning-foreground"}
            />
            <IntelCard
              icon={Percent}
              label="Margem média"
              value={formatPct(intelligence.avgMargin)}
              tone={intelligence.avgMargin >= 0.15 ? "text-success" : "text-warning-foreground"}
            />
            <IntelCard
              icon={DollarSign}
              label="Melhor preço"
              value={formatBRL(intelligence.bestWonPrice)}
              tone="text-primary"
            />
          </div>
        </div>

        {/* Recent sales table */}
        {recentSales.length > 0 && (
          <div className="sm:col-span-2">
            <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              <Clock className="h-3 w-3" /> Últimas vendas
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-1 pr-2 text-left font-medium">Data</th>
                    <th className="pb-1 pr-2 text-right font-medium">Preço</th>
                    <th className="pb-1 pr-2 text-right font-medium">Qtd</th>
                    <th className="pb-1 text-right font-medium">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.map((sale, i) => (
                    <tr key={i} className="border-b border-border/50">
                      <td className="py-1 pr-2 text-muted-foreground">
                        {new Date(sale.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="py-1 pr-2 text-right num font-medium text-foreground">
                        {formatBRL(sale.price)}
                      </td>
                      <td className="py-1 pr-2 text-right num text-muted-foreground">
                        {sale.quantity}
                      </td>
                      <td className="py-1 text-right num text-foreground">
                        {formatBRL(sale.price * sale.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Recommendation */}
        <div className="sm:col-span-2">
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
            <div className="flex items-start gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-primary">
                  Recomendação: {formatBRL(intelligence.recommendationPrice)}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  Probabilidade estimada de vitória:{" "}
                  <span className="font-semibold text-foreground">
                    {Math.round(intelligence.estimatedWinProbability * 100)}%
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className={cn("num truncate font-semibold text-foreground", tone)}>{value}</span>
    </div>
  );
}

function IntelCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  tone: string;
}) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
        <Icon className="h-3 w-3" />
        <span className="font-medium">{label}</span>
      </div>
      <div className={cn("mt-0.5 num text-sm font-bold", tone)}>{value}</div>
    </div>
  );
}

