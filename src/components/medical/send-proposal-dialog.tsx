import { useMemo } from "react";
import { CheckCircle2, FileText, MinusCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";
import type { QuoteItem } from "@/lib/medical/types";
import { classifyItem, type ItemClassification } from "@/lib/medical/product-matching";
import { itemTotal, formatBRL, formatPct } from "@/lib/medical/pricing";
import { generateProposalPdf } from "@/lib/medical/proposal-pdf";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  selectedIndices: Set<number>;
  minMargin: number;
  onConfirm: () => boolean;
}

interface SelectedEntry {
  item: QuoteItem;
  classification: ItemClassification;
}

export function SendProposalDialog({
  open,
  onOpenChange,
  quote,
  selectedIndices,
  minMargin,
  onConfirm,
}: Props) {
  const analysis = useMemo(() => {
    const selected: SelectedEntry[] = Array.from(selectedIndices)
      .map((idx) => quote.items[idx])
      .filter((item): item is QuoteItem => Boolean(item))
      .map((item) => ({ item, classification: classifyItem(item) }));
    const notSelected = quote.items
      .map((it, idx) => ({ item: it, idx }))
      .filter(({ idx }) => !selectedIndices.has(idx));
    const totalValue = selected.reduce((s, { item }) => s + itemTotal(item), 0);
    const totalCost = selected.reduce((s, { item }) => s + item.cost_price * item.quantity, 0);
    const margin = totalValue > 0 ? (totalValue - totalCost) / totalValue : 0;
    return {
      selected,
      notSelected,
      totalValue,
      totalCost,
      margin,
      selectedCount: selected.length,
      notSelectedCount: notSelected.length,
    };
  }, [quote, selectedIndices]);

  const handleConfirm = () => {
    const confirmed = onConfirm();
    if (confirmed) {
      onOpenChange(false);
    }
  };

  const hasErpGrouping = (entries: SelectedEntry[]) =>
    entries.some(
      ({ classification }) =>
        !!classification.matched &&
        !!classification.matched.product &&
        classification.matched.erpConfirmed === true,
    );

  const groupKeyOf = (entry: SelectedEntry, erp: boolean) =>
    erp && entry.classification.matched && entry.classification.matched.product
      ? `erp:${entry.classification.matched.product.id}`
      : `cls:${entry.classification.classification}`;

  const groupLabelOf = (entry: SelectedEntry, erp: boolean) =>
    erp && entry.classification.matched?.product
      ? entry.classification.matched.product.name ||
        entry.classification.matched.product.id ||
        "ERP"
      : entry.classification.classification.replace(/_/g, " ");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Enviar proposta
          </DialogTitle>
          <DialogDescription>
            Revise os itens selecionados antes de enviar para {quote.customer_name}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg border bg-card p-3">
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Itens selecionados
                </div>
                <div className="mt-1 text-lg font-bold text-success">{analysis.selectedCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Itens omitidos
                </div>
                <div className="mt-1 text-lg font-bold text-muted-foreground">
                  {analysis.notSelectedCount}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Valor total
                </div>
                <div className="mt-1 text-lg font-bold text-foreground num">
                  {formatBRL(analysis.totalValue)}
                </div>
              </div>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 text-sm">
              <div className="flex items-center justify-center gap-2">
                <span className="text-muted-foreground">Margem</span>
                <span
                  className={cn(
                    "num font-bold",
                    analysis.margin >= minMargin ? "text-success" : "text-danger",
                  )}
                >
                  {formatPct(analysis.margin)}
                </span>
              </div>
              <div className="flex items-center justify-center gap-2">
                <span className="text-muted-foreground">Custo</span>
                <span className="num font-medium text-foreground">
                  {formatBRL(analysis.totalCost)}
                </span>
              </div>
            </div>
            {analysis.margin < minMargin && (
              <div className="mt-3 rounded-lg border border-danger/30 bg-danger/10 p-3 text-[11px] text-danger">
                Margem abaixo do piso de {formatPct(minMargin)}. Envio exigirá aprovação adicional.
              </div>
            )}
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Itens que serão enviados ({analysis.selectedCount})
            </div>
            {/* Group selected items by classification for a compact summary */}
            <div className="max-h-40 space-y-2 overflow-y-auto text-xs">
              {(() => {
                type Group = {
                  key: string;
                  label: string;
                  items: QuoteItem[];
                  count: number;
                  total: number;
                };
                const groups: Record<string, Group> = {};

                const erp = hasErpGrouping(analysis.selected);

                for (const entry of analysis.selected) {
                  const { item } = entry;
                  const groupKey = groupKeyOf(entry, erp);
                  const label = groupLabelOf(entry, erp);

                  if (!groups[groupKey])
                    groups[groupKey] = { key: groupKey, label, items: [], count: 0, total: 0 };
                  groups[groupKey].items.push(item);
                  groups[groupKey].count += 1;
                  groups[groupKey].total += item.unit_price * item.quantity;
                }

                const ordered = Object.values(groups).sort((a, b) => b.total - a.total);

                return ordered.map((g) => (
                  <div key={g.key} className="rounded-md border bg-muted/10 px-2 py-1">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] font-semibold">{g.label}</div>
                      <div className="text-[11px] font-medium">
                        {g.count} itens · {formatBRL(g.total)}
                      </div>
                    </div>
                    <div className="mt-1 space-y-1">
                      {g.items.map((it, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="truncate text-muted-foreground">
                            {it.quantity}x {it.name}
                          </span>
                          <span className="num text-muted-foreground">
                            {formatBRL(it.unit_price)}/un
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </div>
          </div>
          {analysis.notSelected.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                <MinusCircle className="h-3.5 w-3.5" />
                Itens não atendidos ({analysis.notSelectedCount})
              </div>
              <div className="max-h-24 space-y-1 overflow-y-auto">
                {analysis.notSelected.map(({ item, idx }) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-xs"
                  >
                    <span className="truncate text-muted-foreground">
                      {item.quantity}x {item.name}
                    </span>
                    <span className="text-xs text-muted-foreground">Não atender</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A proposta será enviada para {quote.customer_name} via conector
            {quote.source_type === "portal" ? " da plataforma de origem" : " de e-mail"}. O status
            da cotação passará para "Enviado".
          </p>
        </div>
        <DialogFooter>
          <div className="flex w-full items-center justify-between gap-2">
            <div className="text-xs text-muted-foreground">
              Total: <span className="font-medium">{formatBRL(analysis.totalValue)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // build CSV rows
                  const rows: string[] = [];
                  const header = [
                    "group",
                    "sku",
                    "name",
                    "quantity",
                    "unit_price",
                    "total",
                    "cost_price",
                    "margin_pct",
                    "erp_confirmed",
                    "erp_product_id",
                    "erp_product_name",
                  ];
                  rows.push(header.join(","));

                  const erp = hasErpGrouping(analysis.selected);
                  const groups: Record<string, { label: string; items: QuoteItem[] }> = {};
                  for (const entry of analysis.selected) {
                    const { item } = entry;
                    const groupKey = groupKeyOf(entry, erp);
                    const label = groupLabelOf(entry, erp);
                    if (!groups[groupKey]) groups[groupKey] = { label, items: [] };
                    groups[groupKey].items.push(item);
                  }

                  const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
                  for (const gkey of Object.keys(groups)) {
                    const g = groups[gkey];
                    for (const it of g.items) {
                      const total = (it.unit_price * it.quantity).toFixed(2);
                      const margin =
                        it.unit_price * it.quantity > 0
                          ? (
                              ((it.unit_price * it.quantity - it.cost_price * it.quantity) /
                                (it.unit_price * it.quantity)) *
                              100
                            ).toFixed(2)
                          : "0.00";
                      const classification = classifyItem(it);
                      const row = [
                        escape(g.label),
                        escape(it.sku || ""),
                        escape(it.name || ""),
                        it.quantity,
                        it.unit_price.toFixed(2),
                        total,
                        it.cost_price.toFixed(2),
                        margin,
                        classification.matched?.erpConfirmed === true ? "true" : "false",
                        escape(classification.matched?.product?.id || ""),
                        escape(classification.matched?.product?.name || ""),
                      ].join(",");
                      rows.push(row);
                    }
                  }

                  const blob = new Blob([rows.join("\n")], { type: "text/csv;charset=utf-8;" });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement("a");
                  a.href = url;
                  a.download = `proposal-${quote.id || "export"}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  a.remove();
                  URL.revokeObjectURL(url);
                }}
              >
                <FileText className="h-4 w-4" />
                Baixar CSV
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  // Build a minimal quote object with only selected items for PDF
                  const selectedItems = analysis.selected.map(({ item }) => item);
                  const tmpQuote: Quote = {
                    ...quote,
                    items: selectedItems,
                  };
                  generateProposalPdf(tmpQuote);
                }}
              >
                <FileText className="h-4 w-4" />
                Baixar PDF
              </Button>
              <Button size="sm" className="gap-1.5" onClick={handleConfirm}>
                <Send className="h-4 w-4" />
                Confirmar envio
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
