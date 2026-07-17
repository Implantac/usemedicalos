import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Plus, Sparkles, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { OWNERS, PRODUCTS } from "@/lib/medical/mock-data";
import type { QuoteItem, SourceType } from "@/lib/medical/types";
import { SOURCE_LABEL } from "@/lib/medical/types";
import { classify, slaHoursFor } from "@/lib/medical/classifier";
import { formatBRL, itemTotal, quoteTotals, suggestPrice } from "@/lib/medical/pricing";
import { PriorityBadge } from "./badges";
import type { NewQuoteInput } from "@/hooks/use-quotes";
import { cn } from "@/lib/utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate: (input: NewQuoteInput) => { id: string };
}

const SEGMENTS = ["Hospital privado", "Hospital público", "Hospital especializado", "Clínica", "Distribuidor", "Órgão público"];

export function NewQuoteDialog({ open, onOpenChange, onCreate }: Props) {
  const [step, setStep] = useState<1 | 2>(1);
  const [ownerId, setOwnerId] = useState(OWNERS[0].id);
  const [customer, setCustomer] = useState("");
  const [segment, setSegment] = useState(SEGMENTS[0]);
  const [source, setSource] = useState<SourceType>("email");
  const [payload, setPayload] = useState("");
  const [items, setItems] = useState<QuoteItem[]>([]);
  const [search, setSearch] = useState("");

  const cls = useMemo(() => classify(payload || " "), [payload]);
  const slaH = slaHoursFor(cls.priority);
  const totals = quoteTotals(items);

  const filteredProducts = useMemo(() => {
    const s = search.trim().toLowerCase();
    return PRODUCTS.filter(
      (p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s),
    ).slice(0, 6);
  }, [search]);

  function reset() {
    setStep(1);
    setOwnerId(OWNERS[0].id);
    setCustomer("");
    setSegment(SEGMENTS[0]);
    setSource("email");
    setPayload("");
    setItems([]);
    setSearch("");
  }

  function addProduct(pid: string) {
    const p = PRODUCTS.find((x) => x.id === pid);
    if (!p) return;
    const draftItem: QuoteItem = {
      product_id: p.id,
      sku: p.sku,
      name: p.name,
      quantity: 10,
      unit_price: p.last_suggested_price,
      cost_price: p.cost_price,
    };
    draftItem.unit_price = suggestPrice(draftItem);
    setItems((xs) => [...xs, draftItem]);
    setSearch("");
  }

  function canGoNext() {
    return customer.trim().length > 1 && payload.trim().length > 5;
  }

  function submit() {
    if (items.length === 0) {
      toast.error("Adicione ao menos um item à cotação.");
      return;
    }
    const q = onCreate({
      owner_id: ownerId,
      customer_name: customer.trim(),
      customer_segment: segment,
      source_type: source,
      original_payload: payload.trim(),
      items,
    });
    toast.success(`Cotação #${q.id.toUpperCase()} criada e classificada.`);
    reset();
    onOpenChange(false);
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1rem)] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:w-full">
        <DialogHeader className="border-b px-4 py-3 sm:px-5">
          <DialogTitle className="text-base">Nova cotação</DialogTitle>
          <DialogDescription className="text-xs">
            Passo {step} de 2 · {step === 1 ? "captura e classificação" : "itens e precificação"}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
        {step === 1 ? (
          <div className="space-y-3 p-4 sm:p-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Origem</Label>
                <Select value={source} onValueChange={(v) => setSource(v as SourceType)}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(SOURCE_LABEL) as SourceType[]).map((s) => (
                      <SelectItem key={s} value={s}>{SOURCE_LABEL[s]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Vendedor responsável</Label>
                <Select value={ownerId} onValueChange={setOwnerId}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {OWNERS.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name} · {o.territory}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Cliente</Label>
                <Input value={customer} onChange={(e) => setCustomer(e.target.value)} className="h-9" placeholder="Ex.: Hospital São Lucas" />
              </div>
              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Segmento</Label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEGMENTS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Payload recebido</Label>
              <Textarea
                value={payload}
                onChange={(e) => setPayload(e.target.value)}
                className="min-h-32 text-sm"
                placeholder="Cole o e-mail, mensagem WhatsApp ou descrição do pedido…"
              />
            </div>

            <div className="rounded-md border border-dashed border-primary/30 bg-primary/5 p-2">
              <div className="flex flex-wrap items-center gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 font-semibold text-primary">
                  <Sparkles className="h-3 w-3" /> Auto-classificação:
                </span>
                <PriorityBadge priority={cls.priority} />
                <span className="text-muted-foreground">SLA: {slaH}h</span>
                {cls.keywords.length > 0 && (
                  <span className="text-muted-foreground">
                    · sinais: {cls.keywords.join(", ")}
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4 sm:p-5">
            <div>
              <Label className="text-[10px] uppercase text-muted-foreground">Adicionar produto</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} className="h-9" placeholder="Buscar por SKU ou nome…" />
              {search && (
                <ul className="mt-1 max-h-40 overflow-y-auto rounded-md border bg-popover text-sm">
                  {filteredProducts.length === 0 && (
                    <li className="px-3 py-2 text-xs text-muted-foreground">Nenhum produto encontrado.</li>
                  )}
                  {filteredProducts.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => addProduct(p.id)}
                        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left hover:bg-accent"
                      >
                        <span className="min-w-0">
                          <span className="truncate text-xs font-semibold">{p.name}</span>
                          <span className="ml-1 text-[10px] text-muted-foreground">{p.sku}</span>
                        </span>
                        <span className="num text-[11px] text-muted-foreground">custo {formatBRL(p.cost_price)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              {items.length === 0 && (
                <div className="rounded-md border border-dashed p-6 text-center text-xs text-muted-foreground">
                  Nenhum item ainda. Busque um produto acima.
                </div>
              )}
              {items.map((it, idx) => {
                const total = itemTotal(it);
                return (
                  <div key={idx} className="rounded-md border bg-card p-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0 text-xs">
                        <div className="truncate font-semibold">{it.name}</div>
                        <div className="text-[10px] text-muted-foreground">{it.sku} · custo {formatBRL(it.cost_price)}</div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger"
                        onClick={() => setItems((xs) => xs.filter((_, i) => i !== idx))}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="mt-1 grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Qtd</Label>
                        <Input
                          type="number"
                          min={1}
                          value={it.quantity}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, quantity: v } : x)));
                          }}
                          className="h-8 num"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Preço</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => {
                            const v = Number(e.target.value) || 0;
                            setItems((xs) => xs.map((x, i) => (i === idx ? { ...x, unit_price: v } : x)));
                          }}
                          className="h-8 num"
                        />
                      </div>
                      <div>
                        <Label className="text-[10px] uppercase text-muted-foreground">Total</Label>
                        <div className="flex h-8 items-center num text-sm font-semibold">{formatBRL(total)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {items.length > 0 && (
              <div className="grid grid-cols-3 gap-2 rounded-md border bg-muted/40 p-2 text-center">
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
                  <div className={cn("num text-sm font-bold", totals.margin < 0.12 ? "text-danger" : "text-success")}>
                    {(totals.margin * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2 border-t bg-muted/30 px-5 py-3">
          {step === 1 ? (
            <>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button size="sm" onClick={() => setStep(2)} disabled={!canGoNext()}>
                Próximo <ArrowRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="mr-1 h-3.5 w-3.5" /> Voltar
              </Button>
              <Button size="sm" onClick={submit} disabled={items.length === 0}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Criar cotação
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
