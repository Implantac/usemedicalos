import { useMemo } from "react";
import { CheckCircle2, FileText, MinusCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";
import { itemTotal, formatBRL, formatPct } from "@/lib/medical/pricing";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote: Quote;
  selectedIndices: Set<number>;
  onConfirm: () => void;
}

export function SendProposalDialog({ open, onOpenChange, quote, selectedIndices, onConfirm }: Props) {
  const analysis = useMemo(() => {
    const selected = Array.from(selectedIndices).map((idx) => ({ item: quote.items[idx] }));
    const notSelected = quote.items.map((it, idx) => ({ item: it, idx })).filter(({ idx }) => !selectedIndices.has(idx));
    const totalValue = selected.reduce((s, { item }) => s + itemTotal(item), 0);
    const totalCost = selected.reduce((s, { item }) => s + item.cost_price * item.quantity, 0);
    const margin = totalValue > 0 ? (totalValue - totalCost) / totalValue : 0;
    return { selected, notSelected, totalValue, totalCost, margin, selectedCount: selected.length, notSelectedCount: notSelected.length };
  }, [quote, selectedIndices]);

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
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Itens atendidos</div>
                <div className="mt-1 text-lg font-bold text-success">{analysis.selectedCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nao atendidos</div>
                <div className="mt-1 text-lg font-bold text-muted-foreground">{analysis.notSelectedCount}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Valor total</div>
                <div className="mt-1 text-lg font-bold text-foreground num">{formatBRL(analysis.totalValue)}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-sm">
              <span className="text-muted-foreground">Margem:</span>
              <span className={cn("num font-bold", analysis.margin >= 0.12 ? "text-success" : "text-danger")}>{formatPct(analysis.margin)}</span>
              <span className="text-muted-foreground">Custo:</span>
              <span className="num font-medium text-foreground">{formatBRL(analysis.totalCost)}</span>
            </div>
          </div>
          <div>
            <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-success">
              <CheckCircle2 className="h-3.5 w-3.5" />
              Itens que serao enviados ({analysis.selectedCount})
            </div>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {analysis.selected.map(({ item }, i) => (
                <div key={i} className="flex items-center justify-between rounded-md bg-success/5 px-2 py-1 text-xs">
                  <span className="truncate font-medium text-foreground">{item.quantity}x {item.name}</span>
                  <span className="num text-muted-foreground">{formatBRL(item.unit_price)}/un</span>
                </div>
              ))}
            </div>
          </div>
          {analysis.notSelected.length > 0 && (
            <div>
              <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
              <MinusCircle className="h-3.5 w-3.5" />
                Itens NAO atendidos ({analysis.notSelectedCount})
              </div>
              <div className="max-h-24 space-y-1 overflow-y-auto">
                {analysis.notSelected.map(({ item, idx }) => (
                  <div key={idx} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-xs">
                    <span className="truncate text-muted-foreground">{item.quantity}x {item.name}</span>
                    <span className="text-xs text-muted-foreground">Nao atender</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <p className="text-xs text-muted-foreground">
            A proposta sera enviada para {quote.customer_name} via conector
            {quote.source_type === "portal" ? " da plataforma de origem" : " de e-mail"}.
            O status da cotacao passara para "Enviado".
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" className="gap-1.5" onClick={() => { onConfirm(); onOpenChange(false); }}>
            <Send className="h-4 w-4" />
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}