import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Sparkles, Trash2, X } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { Quote, QuoteStatus } from "@/lib/medical/types";
import { STATUS_LABEL, MIN_MARGIN } from "@/lib/medical/types";
import { formatBRL, formatPct, itemMargin, itemTotal, quoteTotals, suggestPrice } from "@/lib/medical/pricing";
import { PriorityBadge, SourceTag, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";
import { sendToTotvs } from "@/lib/medical/totvs-mock";

interface Props {
  quote: Quote | null;
  onClose: () => void;
  onUpdateItem: (quoteId: string, index: number, patch: Partial<Quote["items"][number]>) => void;
  onRemoveItem: (quoteId: string, index: number) => void;
  onUpdateQuote: (quoteId: string, patch: Partial<Quote>) => void;
}

export function QuoteDrawer({ quote, onClose, onUpdateItem, onRemoveItem, onUpdateQuote }: Props) {
  const [submitting, setSubmitting] = useState(false);
  if (!quote) return null;
  const totals = quoteTotals(quote.items);
  const marginOk = totals.margin >= MIN_MARGIN;

  const handleGenerateProposal = async () => {
    if (!marginOk) {
      toast.error("Margem abaixo do mínimo (12%). Ajuste preços antes de enviar.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendToTotvs(quote);
      onUpdateQuote(quote.id, { status: "enviado", totvs_synced: true, totvs_order_id: res.order_id });
      toast.success(res.message);
    } catch {
      toast.error("Falha ao integrar com TOTVS Protheus.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b bg-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <SheetTitle className="truncate text-base font-bold">{quote.customer_name}</SheetTitle>
              <SheetDescription className="mt-0.5 text-xs">
                #{quote.id.toUpperCase()} · {quote.customer_segment}
              </SheetDescription>
            </div>
            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={quote.priority} />
            <StatusBadge status={quote.status} />
            <SourceTag source={quote.source_type} />
            <SlaIndicator deadline={quote.sla_deadline} />
            {quote.totvs_synced && (
              <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" /> TOTVS {quote.totvs_order_id}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {/* Payload original + IA classification */}
          <section className="border-b p-4">
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Payload original
            </h3>
            <p className="rounded-md bg-muted p-3 text-sm text-foreground">{quote.original_payload}</p>
            {quote.keywords.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> Auto-classificação:
                </span>
                {quote.keywords.map((k) => (
                  <span key={k} className="rounded-md bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                    {k}
                  </span>
                ))}
              </div>
            )}
          </section>

          {/* Items */}
          <section className="p-4">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Itens da cotação
              </h3>
              <span className="text-xs text-muted-foreground">{quote.items.length} item(ns)</span>
            </div>

            <div className="space-y-2">
              {quote.items.map((it, idx) => {
                const m = itemMargin(it);
                const suggested = suggestPrice(it);
                const ok = m >= MIN_MARGIN;
                return (
                  <div key={idx} className="rounded-lg border bg-card p-3 card-shadow">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{it.name}</div>
                        <div className="text-[11px] text-muted-foreground num">
                          SKU {it.sku} · custo {formatBRL(it.cost_price)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger"
                        onClick={() => onRemoveItem(quote.id, idx)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => onUpdateItem(quote.id, idx, { quantity: Number(e.target.value) || 0 })}
                          className="h-8 num"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Preço unit.</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => onUpdateItem(quote.id, idx, { unit_price: Number(e.target.value) || 0 })}
                          className={cn("h-8 num", !ok && "border-danger focus-visible:ring-danger")}
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
                        <div className="flex h-8 items-center num text-sm font-semibold">{formatBRL(itemTotal(it))}</div>
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Margem</Label>
                        <div className={cn("flex h-8 items-center num text-sm font-semibold", ok ? "text-success" : "text-danger")}>
                          {formatPct(m)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center justify-between rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 py-1.5">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                        <Sparkles className="h-3 w-3" /> Sugestão IA
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="num text-xs font-bold text-foreground">{formatBRL(suggested)}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[11px]"
                          onClick={() => onUpdateItem(quote.id, idx, { unit_price: suggested })}
                        >
                          Aplicar
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="border-t p-4">
            <Label className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Notas internas
            </Label>
            <Textarea
              value={quote.notes ?? ""}
              onChange={(e) => onUpdateQuote(quote.id, { notes: e.target.value })}
              placeholder="Observações para o time comercial…"
              className="mt-1 min-h-20 text-sm"
            />
          </section>
        </div>

        {/* Footer */}
        <div className="border-t bg-card p-3">
          <div className="mb-3 grid grid-cols-3 gap-2 rounded-lg border bg-muted/50 p-2 text-center">
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Receita</div>
              <div className="num text-sm font-bold">{formatBRL(totals.revenue)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Custo</div>
              <div className="num text-sm font-bold">{formatBRL(totals.cost)}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase text-muted-foreground">Margem</div>
              <div className={cn("num text-sm font-bold", marginOk ? "text-success" : "text-danger")}>
                {formatPct(totals.margin)}
              </div>
            </div>
          </div>

          {!marginOk && (
            <div className="mb-2 flex items-start gap-2 rounded-md border border-danger/30 bg-danger/10 p-2 text-xs text-danger">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Margem abaixo de {formatPct(MIN_MARGIN)}. Ajuste antes de enviar a proposta.</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row">
            <Select
              value={quote.status}
              onValueChange={(v) => onUpdateQuote(quote.id, { status: v as QuoteStatus })}
            >
              <SelectTrigger className="h-9 sm:w-56"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={submitting || !marginOk}
              onClick={handleGenerateProposal}
            >
              <FileText className="mr-2 h-4 w-4" />
              {submitting ? "Enviando ao TOTVS…" : "Gerar Proposta & Enviar TOTVS"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
