import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, FileText, Sparkles, Trash2, X } from "lucide-react";
import { generateProposalPdf } from "@/lib/medical/proposal-pdf";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { ClientTier, Quote, QuoteStatus } from "@/lib/medical/types";
import { CLIENT_TIER_DISCOUNT, STATUS_LABEL } from "@/lib/medical/types";
import { basePrice, formatBRL, formatPct, itemMargin, itemTotal, pricingSignal, quoteTotals, suggestPrice } from "@/lib/medical/pricing";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { useProductOverrides } from "@/hooks/use-product-overrides";
import { useQuotes } from "@/hooks/use-quotes";
import { enrichProductsWithMarket } from "@/lib/medical/pricing-flywheel";
import { calculateSuggestedPrice, PRICING_STATUS_LABEL, type PricingStatus } from "@/lib/medical/pricing-engine";

import { PriorityBadge, SourceTag, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";
import { sendToUseSistemas } from "@/lib/medical/use-sistemas-mock";
import { appendActivity } from "@/lib/medical/activity";
import { QuoteTimeline } from "./quote-timeline";
import { checkQuote } from "@/lib/medical/compliance";
import { ComplianceAlert } from "./compliance-alert";
import { CommissionBadge } from "./commission-badge";
import {
  addOverride,
  listOverrides,
  revokeOverride,
} from "@/lib/medical/compliance-override";
import { benchmarkFor, type Region } from "@/lib/medical/benchmarks";
import { ownerById, PRODUCTS } from "@/lib/medical/mock-data";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";

interface Props {
  quote: Quote | null;
  onClose: () => void;
  onUpdateItem: (quoteId: string, index: number, patch: Partial<Quote["items"][number]>) => void;
  onRemoveItem: (quoteId: string, index: number) => void;
  onUpdateQuote: (quoteId: string, patch: Partial<Quote>) => void;
}

export function QuoteDrawer({ quote, onClose, onUpdateItem, onRemoveItem, onUpdateQuote }: Props) {
  const [submitting, setSubmitting] = useState(false);
  const [activityVersion, setActivityVersion] = useState(0);
  const [overrideVersion, setOverrideVersion] = useState(0);
  const [complianceConfirmed, setComplianceConfirmed] = useState(false);
  const overriddenSkus = useMemo(
    () => (quote ? new Set(listOverrides(quote.id).map((o) => o.sku)) : new Set<string>()),
    [quote?.id, overrideVersion],
  );
  if (!quote) return null;
  const { config: tenantConfig } = useTenantConfig(quote.tenant_id);
  const minMargin = tenantConfig.min_margin;
  const totals = quoteTotals(quote.items);
  const marginOk = totals.margin >= minMargin;
  const hasNegative = quote.items.some((it) => pricingSignal(it, minMargin) === "negative");

  // Motor de precificação 4 camadas: catálogo enriquecido pelo flywheel + overrides do gestor.
  const { quotes: allQuotes } = useQuotes();
  const { applyTo: applyProductOverride } = useProductOverrides();
  const productBySku = useMemo(() => {
    const enriched = enrichProductsWithMarket(PRODUCTS, allQuotes).map(applyProductOverride);
    const m = new Map<string, (typeof enriched)[number]>();
    for (const p of enriched) m.set(p.sku, p);
    return m;
  }, [allQuotes, applyProductOverride]);


  const compliance = checkQuote(quote, overriddenSkus);
  const complianceBlocked = compliance.status === "blocked";
  const complianceRequiresConfirm =
    compliance.status === "warning" || compliance.status === "overridden";
  const complianceGateOk = !complianceBlocked && (!complianceRequiresConfirm || complianceConfirmed);
  const canSend = marginOk && !hasNegative && complianceGateOk;

  const bumpActivity = () => setActivityVersion((v) => v + 1);

  const handleOverride = (sku: string) => {
    const reason = window.prompt(
      `Justificativa do gestor para liberar ${sku} (bloqueio ANVISA/CMED):`,
      "",
    );
    if (!reason || !reason.trim()) return;
    addOverride({
      quote_id: quote.id,
      sku,
      manager_id: quote.owner_id,
      reason: reason.trim(),
      ttl_hours: 24,
    });
    appendActivity({
      quote_id: quote.id,
      type: "compliance_override",
      message: `Bloqueio liberado por gestor: ${sku}`,
      meta: { sku, reason: reason.trim() },
    });
    setOverrideVersion((v) => v + 1);
    bumpActivity();
    toast.success(`${sku} liberado sob justificativa.`);
  };

  const handleRevoke = (sku: string) => {
    revokeOverride(quote.id, sku);
    appendActivity({
      quote_id: quote.id,
      type: "compliance_override_revoked",
      message: `Liberação revogada: ${sku}`,
      meta: { sku },
    });
    setOverrideVersion((v) => v + 1);
    bumpActivity();
    toast.message(`Liberação de ${sku} revogada.`);
  };

  const handleGenerateProposal = async () => {
    if (!marginOk) {
      toast.error("Margem abaixo do mínimo (12%). Ajuste preços antes de enviar.");
      return;
    }
    if (complianceBlocked) {
      toast.error("Cotação bloqueada por restrição ANVISA/CMED.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await sendToUseSistemas(quote);
      onUpdateQuote(quote.id, { status: "enviado", use_sistemas_synced: true, use_sistemas_order_id: res.order_id });
      appendActivity({ quote_id: quote.id, type: "sent_use_sistemas", message: `Enviado ao Use Sistemas`, meta: { order_id: res.order_id } });
      bumpActivity();
      toast.success(res.message);
    } catch {
      toast.error("Falha ao integrar com Use Sistemas.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl">
        <SheetHeader className="space-y-2 border-b bg-card p-4">
          <div className="min-w-0 pr-8">
            <SheetTitle className="truncate text-base font-bold">{quote.customer_name}</SheetTitle>
            <SheetDescription className="mt-0.5 text-xs">
              #{quote.id.toUpperCase()} · {quote.customer_segment}
            </SheetDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <PriorityBadge priority={quote.priority} />
            <StatusBadge status={quote.status} />
            <SourceTag source={quote.source_type} />
            <SlaIndicator deadline={quote.sla_deadline} />
            {quote.use_sistemas_synced && (
              <span className="inline-flex items-center gap-1 rounded-md bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
                <CheckCircle2 className="h-3 w-3" /> Use Sistemas {quote.use_sistemas_order_id}
              </span>
            )}
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <section className="space-y-3 border-b p-4">
            <CommissionBadge quote={quote} />
            <ClientTierSelector
              value={quote.client_tier ?? "B"}
              onChange={(tier) => {
                onUpdateQuote(quote.id, { client_tier: tier });
                appendActivity({
                  quote_id: quote.id,
                  type: "client_tier_changed",
                  message: `Tier do cliente ajustado para ${tier}`,
                  meta: { tier },
                });
                bumpActivity();
              }}
            />
            <ComplianceAlert
              report={compliance}
              confirmed={complianceConfirmed}
              onConfirmedChange={setComplianceConfirmed}
              onOverride={handleOverride}
              onRevoke={handleRevoke}
            />
            <BenchmarkMini
              region={ownerById(quote.owner_id).territory as Region}
              selfMargin={totals.margin}
              selfTicket={totals.revenue}
            />
          </section>






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
                const catalogProduct = productBySku.get(it.sku);
                const engine = catalogProduct
                  ? calculateSuggestedPrice(catalogProduct, { tier: quote.client_tier ?? "B", quantity: it.quantity })
                  : null;
                const suggested = engine ? engine.suggested_price : suggestPrice(it, tenantConfig.target_margin);
                const base = basePrice(it.cost_price);
                const signal = pricingSignal(it, minMargin);

                const ok = signal === "ok";
                const negative = signal === "negative";
                const belowBase = signal === "below_base";
                return (
                  <div
                    key={idx}
                    className={cn(
                      "rounded-lg border bg-card p-3 card-shadow",
                      negative && "border-danger/60 bg-danger/5",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{it.name}</div>
                        <div className="text-[11px] text-muted-foreground num">
                          SKU {it.sku} · custo {formatBRL(it.cost_price)} · piso {formatBRL(base)}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-danger"
                        onClick={() => {
                          appendActivity({ quote_id: quote.id, type: "item_removed", message: `Item removido: ${it.name}`, meta: { sku: it.sku } });
                          onRemoveItem(quote.id, idx);
                          bumpActivity();
                        }}
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
                          className={cn(
                            "h-8 num",
                            negative && "border-danger bg-danger/5 text-danger focus-visible:ring-danger",
                            belowBase && !negative && "border-warning/60 focus-visible:ring-warning",
                          )}
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

                    {negative && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md border border-danger/40 bg-danger/10 px-2 py-1.5 text-[11px] font-medium text-danger">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>Margem negativa: ajuste necessário — preço abaixo do custo de aquisição.</span>
                      </div>
                    )}
                    {belowBase && (
                      <div className="mt-2 flex items-start gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-2 py-1.5 text-[11px] font-medium text-warning-foreground">
                        <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0" />
                        <span>Abaixo do piso comercial ({formatBRL(base)} = custo × 1.25).</span>
                      </div>
                    )}

                    <div className="mt-2 rounded-md border border-dashed border-primary/30 bg-primary/5 px-2 py-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary">
                          <Sparkles className="h-3 w-3" />
                          {engine ? "Motor 4 camadas" : "Sugestão IA"}
                        </span>
                        <div className="flex items-center gap-2">
                          {engine && <EngineStatusChip status={engine.status} />}
                          <span className="num text-xs font-bold text-foreground">{formatBRL(suggested)}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 px-2 text-[11px]"
                            disabled={engine?.status === "BLOCKED"}
                            onClick={() => {
                              onUpdateItem(quote.id, idx, { unit_price: suggested });
                              appendActivity({
                                quote_id: quote.id,
                                type: "price_suggested",
                                message: `${engine ? "Motor" : "Sugestão IA"} aplicado em ${it.sku}: ${formatBRL(suggested)}`,
                                meta: { sku: it.sku, engine_status: engine?.status },
                              });
                              bumpActivity();
                            }}
                          >
                            Aplicar
                          </Button>
                        </div>
                      </div>
                      {engine && (
                        <div className="mt-1 grid grid-cols-3 gap-1 text-[10px] text-muted-foreground num">
                          <span>Floor {formatBRL(engine.floor_price)}</span>
                          <span>CMED {engine.compliance_cap ? formatBRL(engine.compliance_cap) : "—"}</span>
                          <span>Mercado {engine.market_target ? formatBRL(engine.market_target) : "—"}</span>
                        </div>
                      )}
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
              onBlur={(e) => {
                if ((e.target.value ?? "") !== (quote.notes ?? "")) return;
                if (e.target.value?.trim()) {
                  appendActivity({ quote_id: quote.id, type: "notes_updated", message: "Notas internas atualizadas" });
                  bumpActivity();
                }
              }}
              placeholder="Observações para o time comercial…"
              className="mt-1 min-h-20 text-sm"
            />
          </section>

          <section className="border-t p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Timeline de atividades
            </h3>
            <QuoteTimeline quoteId={quote.id} version={activityVersion} />
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
              <span>Margem abaixo de {formatPct(minMargin)}. Ajuste antes de enviar a proposta.</span>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Select
              value={quote.status}
              onValueChange={(v) => {
                const to = v as QuoteStatus;
                if (to === quote.status) return;
                appendActivity({
                  quote_id: quote.id,
                  type: "status_changed",
                  message: `Status: ${STATUS_LABEL[quote.status]} → ${STATUS_LABEL[to]}`,
                  meta: { from: quote.status, to },
                });
                onUpdateQuote(quote.id, { status: to });
                bumpActivity();
              }}
            >
              <SelectTrigger className="h-9 w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-9 w-full gap-1.5 sm:w-auto"
              onClick={() => {
                try {
                  generateProposalPdf(quote);
                  appendActivity({ quote_id: quote.id, type: "pdf_generated", message: "Proposta PDF gerada" });
                  bumpActivity();
                  toast.success("Proposta PDF gerada.");
                } catch (e) {
                  console.error(e);
                  toast.error("Falha ao gerar PDF.");
                }
              }}
            >
              <Download className="h-4 w-4" /> PDF
            </Button>
            <Button
              className="h-9 w-full flex-1 bg-primary text-primary-foreground hover:bg-primary/90 sm:w-auto"
              disabled={submitting || !canSend}
              onClick={handleGenerateProposal}
            >
              <FileText className="mr-2 h-4 w-4 shrink-0" />
              <span className="truncate">
                {submitting
                  ? "Enviando ao Use Sistemas…"
                  : complianceBlocked
                    ? "Bloqueado (Compliance)"
                    : complianceRequiresConfirm && !complianceConfirmed
                      ? "Confirme o checklist para enviar"
                      : "Gerar Proposta & Enviar"}
              </span>
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function BenchmarkMini({
  region,
  selfMargin,
  selfTicket,
}: {
  region: Region;
  selfMargin: number;
  selfTicket: number;
}) {
  const mk = benchmarkFor(region);
  const marginDelta = selfMargin - mk.avgMargin;
  const ticketDelta = mk.avgTicket ? (selfTicket - mk.avgTicket) / mk.avgTicket : 0;
  const Row = ({ label, value, delta, kind }: { label: string; value: string; delta: number; kind: "pp" | "pct" }) => {
    const zero = Math.abs(delta) < 0.001;
    const up = delta > 0;
    const Icon = zero ? Minus : up ? ArrowUp : ArrowDown;
    const tone = zero ? "text-muted-foreground" : up ? "text-success" : "text-destructive";
    const deltaLabel = kind === "pp" ? `${(delta * 100).toFixed(1)}pp` : formatPct(delta);
    return (
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <div className="flex items-center gap-2">
          <span className="num font-semibold text-foreground">{value}</span>
          <span className={cn("inline-flex items-center gap-0.5 num text-[11px] font-semibold", tone)}>
            <Icon className="h-3 w-3" />
            {deltaLabel}
          </span>
        </div>
      </div>
    );
  };
  return (
    <div className="rounded-lg border border-dashed bg-muted/30 p-2.5">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Comparativo de mercado
        </span>
        <span className="text-[10px] text-muted-foreground">{region} · n={mk.sampleSize}</span>
      </div>
      <div className="space-y-1">
        <Row label="Margem vs mercado" value={formatPct(selfMargin)} delta={marginDelta} kind="pp" />
        <Row label="Ticket vs mercado" value={formatBRL(selfTicket)} delta={ticketDelta} kind="pct" />
      </div>
      <p className="mt-1.5 text-[10px] text-muted-foreground">
        Amostras anonimizadas por região (LGPD).
      </p>
    </div>
  );
}

const ENGINE_CHIP_TONE: Record<PricingStatus, string> = {
  OPTIMAL: "bg-success/15 text-success border-success/30",
  MARKET_MISSING: "bg-muted text-muted-foreground border-muted-foreground/20",
  WARNING: "bg-warning/15 text-warning border-warning/30",
  COMPLIANCE_LIMIT: "bg-warning/15 text-warning border-warning/30",
  BLOCKED: "bg-danger/15 text-danger border-danger/30",
};

function EngineStatusChip({ status }: { status: PricingStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider",
        ENGINE_CHIP_TONE[status],
      )}
    >
  );
}

const TIER_TONE: Record<ClientTier, string> = {
  A: "bg-primary/15 text-primary border-primary/30",
  B: "bg-muted text-foreground border-border",
  C: "bg-warning/15 text-warning-foreground border-warning/30",
};

function ClientTierSelector({ value, onChange }: { value: ClientTier; onChange: (t: ClientTier) => void }) {
  const tiers: ClientTier[] = ["A", "B", "C"];
  return (
    <div className="flex items-center justify-between rounded-lg border bg-card px-2.5 py-2">
      <div className="min-w-0">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
          Tier do cliente
        </div>
        <div className="text-[11px] text-muted-foreground">
          Aplica desconto estratégico do motor de precificação.
        </div>
      </div>
      <div className="flex items-center gap-1">
        {tiers.map((t) => {
          const active = value === t;
          const discount = CLIENT_TIER_DISCOUNT[t];
          return (
            <button
              key={t}
              type="button"
              onClick={() => onChange(t)}
              className={cn(
                "inline-flex flex-col items-center rounded border px-2 py-1 text-[10px] font-bold uppercase transition",
                active ? TIER_TONE[t] : "border-border/60 text-muted-foreground hover:bg-muted",
              )}
            >
              <span className="text-xs leading-none">{t}</span>
              <span className="mt-0.5 num text-[9px] leading-none">-{(discount * 100).toFixed(0)}%</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}



