/**
 * Quote Item Table — USE Medical
 *
 * Tabela operacional de itens da cotação.
 * O vendedor trabalha por ITEM — não por cotação.
 * Cada linha mostra: classificação, estoque, última venda, custo, preço sugerido, margem e ação.
 */

import { useMemo, useState } from "react";
import { CheckCircle2, History, MinusCircle, PackageOpen, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { QuoteItem } from "@/lib/medical/types";
import { classifyItem, type MatchedProduct } from "@/lib/medical/product-matching";
import type { Quote } from "@/lib/medical/types";
import { itemMargin, itemTotal, formatBRL, formatPct } from "@/lib/medical/pricing";
import { ProductHistoryPanel } from "./product-history-panel";
import { PriceSlider } from "./price-slider";

interface Props {
  items: QuoteItem[];
  allQuotes: Quote[];
  onUpdateItem: (index: number, patch: Partial<QuoteItem>) => void;
  onToggleSelection: (index: number) => void;
  selectedItems: Set<number>;
  minMargin: number;
  targetMargin: number;
}

type SortField = "classification" | "name" | "qty" | "stock" | "margin" | "price";
type SortDir = "asc" | "desc";

const MATCH_METHOD_LABEL: Record<MatchedProduct["matchMethod"], string> = {
  ean: "EAN / GTIN",
  sku: "SKU",
  manufacturer_ref: "Ref. Fabricante",
  fuzzy_name: "Descrição",
  not_found: "Não localizado",
};

const CLASSIFICATION_ORDER: Record<string, number> = {
  can_attend: 0,
  partial: 1,
  no_stock: 2,
  not_found: 3,
};

const CLASSIFICATION_LABEL: Record<
  string,
  { label: string; icon: typeof CheckCircle2; tone: string }
> = {
  can_attend: { label: "Atender", icon: CheckCircle2, tone: "text-success" },
  partial: { label: "Parcial", icon: PackageOpen, tone: "text-warning-foreground" },
  no_stock: { label: "Sem estoque", icon: XCircle, tone: "text-danger" },
  not_found: { label: "Não localizado", icon: MinusCircle, tone: "text-muted-foreground" },
};

export function QuoteItemTable({
  items,
  allQuotes,
  onUpdateItem,
  onToggleSelection,
  selectedItems,
  minMargin,
  targetMargin,
}: Props) {
  const [sortField, setSortField] = useState<SortField>("classification");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [historySku, setHistorySku] = useState<string | null>(null);
  const [historyProductName, setHistoryProductName] = useState("");
  const [historyMatch, setHistoryMatch] = useState<MatchedProduct | null>(null);

  const classified = useMemo(() => items.map((it) => classifyItem(it)), [items]);

  const sorted = useMemo(() => {
    const list = items.map((it, idx) => ({
      item: it,
      classification: classified[idx],
      index: idx,
    }));
    return list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "classification":
          cmp =
            (CLASSIFICATION_ORDER[a.classification.classification] ?? 99) -
            (CLASSIFICATION_ORDER[b.classification.classification] ?? 99);
          break;
        case "name":
          cmp = a.item.name.localeCompare(b.item.name);
          break;
        case "qty":
          cmp = a.item.quantity - b.item.quantity;
          break;
        case "stock":
          cmp = a.classification.availableStock - b.classification.availableStock;
          break;
        case "margin":
          cmp = itemMargin(a.item) - itemMargin(b.item);
          break;
        case "price":
          cmp = a.item.unit_price - b.item.unit_price;
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [items, classified, sortField, sortDir]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const SortHeader = ({
    field,
    label,
    className,
  }: {
    field: SortField;
    label: string;
    className?: string;
  }) => (
    <button
      type="button"
      onClick={() => toggleSort(field)}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors",
        className,
      )}
    >
      {label}
      {sortField === field && <span className="text-[9px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
    </button>
  );

  const handleOpenHistory = (sku: string, name: string, matched: MatchedProduct | null) => {
    setHistorySku(sku);
    setHistoryProductName(name);
    setHistoryMatch(matched);
  };

  const summary = useMemo(() => {
    const total = items.length;
    const canAttend = classified.filter((c) => c.classification === "can_attend").length;
    const partial = classified.filter((c) => c.classification === "partial").length;
    const noStock = classified.filter((c) => c.classification === "no_stock").length;
    const notFound = classified.filter((c) => c.classification === "not_found").length;
    const selectedCount = selectedItems.size;
    const selectedRevenue =
      selectedItems.size > 0
        ? Array.from(selectedItems).reduce((s, idx) => s + itemTotal(items[idx]), 0)
        : 0;
    return { total, canAttend, partial, noStock, notFound, selectedCount, selectedRevenue };
  }, [items, classified, selectedItems]);

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 text-xs">
        <span className="font-semibold text-foreground">{summary.total} itens</span>
        <span className="inline-flex items-center gap-1 text-success">
          <CheckCircle2 className="h-3 w-3" /> {summary.canAttend} atender
        </span>
        <span className="inline-flex items-center gap-1 text-warning-foreground">
          <PackageOpen className="h-3 w-3" /> {summary.partial} parcial
        </span>
        <span className="inline-flex items-center gap-1 text-danger">
          <XCircle className="h-3 w-3" /> {summary.noStock} sem estoque
        </span>
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          <MinusCircle className="h-3 w-3" /> {summary.notFound} não localizado
        </span>
        {summary.selectedCount > 0 && (
          <span className="ml-auto font-semibold text-primary">
            {summary.selectedCount} selecionados · {formatBRL(summary.selectedRevenue)}
          </span>
        )}
      </div>

      {/* Table header */}
      <div className="hidden gap-2 px-2 lg:grid lg:grid-cols-[32px_32px_1fr_80px_80px_100px_100px_100px_100px_100px]">
        <div />
        <SortHeader field="classification" label="Status" />
        <SortHeader field="name" label="Produto" />
        <SortHeader field="qty" label="Solic." className="text-right" />
        <SortHeader field="stock" label="Estoque" className="text-right" />
        <div className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Últ. venda
        </div>
        <div className="text-right text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Custo
        </div>
        <SortHeader field="price" label="Sugestão" className="text-right" />
        <SortHeader field="margin" label="Margem" className="text-right" />
        <div className="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Ação
        </div>
      </div>

      {/* Items */}
      <div className="space-y-1">
        {sorted.map(({ item, classification, index }) => {
          const cls = CLASSIFICATION_LABEL[classification.classification];
          const Icon = cls.icon;
          const margin = itemMargin(item);
          const marginOk = margin >= minMargin;
          const isSelected = selectedItems.has(index);
          const total = itemTotal(item);
          const lastPriceDelta = classification.lastSalePrice
            ? (item.unit_price - classification.lastSalePrice) / classification.lastSalePrice
            : 0;
          const suggestedDelta = classification.suggestedPrice
            ? (item.unit_price - classification.suggestedPrice) / classification.suggestedPrice
            : 0;
          const priceStatus =
            classification.classification === "not_found"
              ? "Não localizado"
              : classification.classification === "no_stock"
                ? "Sem estoque"
                : classification.classification === "partial"
                  ? `Parcial ${classification.attendQty}/${item.quantity}`
                  : !marginOk
                    ? "Margem abaixo"
                    : classification.lastSalePrice && Math.abs(lastPriceDelta) >= 0.12
                      ? lastPriceDelta > 0
                        ? `+${formatPct(lastPriceDelta)} vs última venda`
                        : `${formatPct(lastPriceDelta)} vs última venda`
                      : classification.suggestedPrice && Math.abs(suggestedDelta) >= 0.12
                        ? suggestedDelta > 0
                          ? `+${formatPct(suggestedDelta)} vs sugestão`
                          : `${formatPct(suggestedDelta)} vs sugestão`
                        : "Preço alinhado";
          const priceStatusTone = !marginOk
            ? "text-danger"
            : priceStatus.includes("+")
              ? "text-warning-foreground"
              : "text-success";

          return (
            <div
              key={index}
              className={cn(
                "group grid gap-2 rounded-lg border p-3 transition-all lg:grid-cols-[32px_32px_1fr_80px_80px_100px_100px_100px_100px_100px]",
                isSelected
                  ? "border-primary/40 bg-primary/5 shadow-sm"
                  : "border-border bg-card hover:border-primary/30 hover:bg-accent/30",
              )}
            >
              {/* Checkbox */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => onToggleSelection(index)}
                  className={cn(
                    "flex h-5 w-5 items-center justify-center rounded border transition-colors",
                    isSelected
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-transparent hover:border-primary/50",
                  )}
                >
                  {isSelected && <CheckCircle2 className="h-3.5 w-3.5" />}
                </button>
              </div>

              {/* Classification icon */}
              <div className="flex items-center" title={cls.label}>
                <Icon className={cn("h-4 w-4", cls.tone)} />
              </div>

              {/* Product info */}
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-foreground">
                    {item.name}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleOpenHistory(item.sku, item.name, classification.matched)}
                    className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-primary group-hover:opacity-100"
                    title="Ver histórico do produto"
                  >
                    <History className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="text-[10px] text-muted-foreground num">
                  SKU {item.sku} · {classification.matched?.product.unit ?? "un"}
                </div>
                <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-muted-foreground">
                  <span>
                    {MATCH_METHOD_LABEL[classification.matched?.matchMethod ?? "not_found"]}
                  </span>
                  <span className="capitalize">{classification.matched?.confidence ?? "low"}</span>
                  <span>
                    {classification.matched?.erpConfirmed ? "ERP confirmado" : "ERP pendente"}
                  </span>
                </div>
                <div className="mt-2 inline-flex items-center gap-2 rounded-full border border-border/80 bg-muted/20 px-2 py-1 text-[10px] font-semibold text-muted-foreground">
                  <span className={priceStatusTone}>{priceStatus}</span>
                </div>
              </div>

              {/* Requested qty */}
              <div className="flex items-center justify-end">
                <Input
                  type="number"
                  min={0}
                  value={item.quantity}
                  onChange={(e) => onUpdateItem(index, { quantity: Number(e.target.value) || 0 })}
                  className="h-8 w-20 text-right num text-sm"
                />
              </div>

              {/* Available stock */}
              <div className="flex items-center justify-end">
                <span
                  className={cn(
                    "num text-sm font-semibold",
                    classification.availableStock <= 0
                      ? "text-danger"
                      : classification.availableStock < item.quantity
                        ? "text-warning-foreground"
                        : "text-success",
                  )}
                >
                  {classification.availableStock}
                </span>
              </div>

              {/* Last sale */}
              <div className="flex flex-col items-end justify-center">
                {classification.lastSalePrice ? (
                  <>
                    <span className="num text-sm font-medium text-foreground">
                      {formatBRL(classification.lastSalePrice)}
                    </span>
                    <span className="num text-[10px] text-muted-foreground">
                      {classification.lastSaleDate ?? "—"}
                    </span>
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </div>

              {/* Cost */}
              <div className="flex items-center justify-end">
                <span className="num text-sm text-muted-foreground">
                  {formatBRL(item.cost_price)}
                </span>
              </div>

              {/* Price */}
              <div className="flex items-center justify-end">
                <PriceSlider
                  value={item.unit_price}
                  costPrice={item.cost_price}
                  minMargin={minMargin}
                  suggestedPrice={classification.suggestedPrice}
                  onChange={(v) => onUpdateItem(index, { unit_price: v })}
                />
              </div>

              {/* Margin */}
              <div className="flex flex-col items-center justify-center">
                <span
                  className={cn("num text-sm font-bold", marginOk ? "text-success" : "text-danger")}
                >
                  {formatPct(margin)}
                </span>
                <span className="num text-[10px] text-muted-foreground">{formatBRL(total)}</span>
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-center gap-1">
                {classification.classification === "can_attend" && (
                  <Button
                    size="sm"
                    variant={isSelected ? "default" : "outline"}
                    className="h-7 px-2 text-[10px]"
                    onClick={() => onToggleSelection(index)}
                  >
                    {isSelected ? "✓ Atender" : "Atender"}
                  </Button>
                )}
                {classification.classification === "partial" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[10px] border-warning/30 text-warning-foreground hover:bg-warning/10"
                    onClick={() => onToggleSelection(index)}
                  >
                    {isSelected
                      ? `✓ ${classification.attendQty}`
                      : `Parcial (${classification.attendQty})`}
                  </Button>
                )}
                {classification.classification === "no_stock" && (
                  <span className="text-[10px] font-medium text-danger">Sem estoque</span>
                )}
                {classification.classification === "not_found" && (
                  <span className="text-[10px] text-muted-foreground">Não localizado</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Product History Panel */}
      {historySku && (
        <ProductHistoryPanel
          sku={historySku}
          productName={historyProductName}
          currentPrice={items.find((it) => it.sku === historySku)?.unit_price ?? 0}
          matched={historyMatch}
          allQuotes={allQuotes}
          onClose={() => setHistorySku(null)}
        />
      )}
    </div>
  );
}
