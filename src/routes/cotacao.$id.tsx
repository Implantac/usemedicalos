import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, Send, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { QuoteSummaryBar } from "@/components/medical/quote-summary-bar";
import { QuoteItemTable } from "@/components/medical/quote-item-table";
import { SendProposalDialog } from "@/components/medical/send-proposal-dialog";
import { ApprovalRequestDialog } from "@/components/medical/approval-request-dialog";
import { sendApprovalNotification } from "@/lib/medical/notification";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { classifyItem, classifyQuoteItems } from "@/lib/medical/product-matching";
import { itemMargin, formatBRL, formatPct } from "@/lib/medical/pricing";
import { buildApprovalSummary, needsApproval } from "@/lib/medical/approval-flow";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/medical/types";
import { nextOperationalQuote } from "@/lib/medical/operational-queue";

export const Route = createFileRoute("/cotacao/$id")({
  head: () => ({
    meta: [
      { title: "Cotação Operacional — USE Medical" },
      {
        name: "description",
        content:
          "Tela operacional de cotação: classificação automática de itens, estoque, histórico, preço sugerido e envio da proposta à origem.",
      },
      { property: "og:title", content: "Cotação Operacional — USE Medical" },
      {
        property: "og:description",
        content:
          "Receba, selecione o que atende, precifique com IA e envie a proposta sem sair da USE Medical.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationalQuotePage,
});

function OperationalQuotePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { quotes, updateItem, setStatus } = useQuotes();
  const { tenant } = useActiveTenant();
  const { config } = useTenantConfig(tenant?.id);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [sendOpen, setSendOpen] = useState(false);
  const [approvalOpen, setApprovalOpen] = useState(false);
  const [pendingApprovalSummary, setPendingApprovalSummary] = useState<{ items: any[]; revenue: number; cost: number; margin: number } | null>(null);

  const quote = quotes.find((q) => q.id === id) ?? null;
  const next = useMemo(() => nextOperationalQuote(quotes, id), [quotes, id]);

  const classification = useMemo(() => {
    if (!quote) return null;
    return classifyQuoteItems(quote.items);
  }, [quote?.items]);

  const recommended = useMemo(() => {
    if (!quote) return new Set<number>();
    const set = new Set<number>();
    quote.items.forEach((it, idx) => {
      const cls = classifyItem(it);
      if (cls.classification === "can_attend" && itemMargin(it) >= config.min_margin) {
        set.add(idx);
      }
    });
    return set;
  }, [quote, config.min_margin]);

  const handleSendConfirm = () => {
    if (!quote || selected.size === 0) {
      setSendOpen(false);
      return false;
    }
    const summary = buildApprovalSummary(Array.from(selected).map((i) => quote.items[i]));
    if (needsApproval(summary.margin, config.min_margin)) {
      // open approval dialog instead of immediately changing status
      setPendingApprovalSummary(summary);
      setSendOpen(false);
      setApprovalOpen(true);
      return false;
    }
    setStatus(quote.id, "enviado");
    toast.success(`Proposta enviada · ${quote.items.length} itens · ${formatBRL(summary.revenue)} · margem ${formatPct(summary.margin)}`);
    setSelected(new Set());
    setSendOpen(false);
    return true;
  };

  const handleRequestApproval = async (reason: string) => {
    if (!quote || !pendingApprovalSummary) return;
    try {
      await sendApprovalNotification(quote.id, pendingApprovalSummary.items.length, pendingApprovalSummary.revenue, reason);
      setStatus(quote.id, "em_negociacao");
      toast.success(`Solicitação de aprovação enviada · margem ${formatPct(pendingApprovalSummary.margin)}`);
    } catch (err) {
      toast.error("Falha ao enviar solicitação de aprovação.");
    }
    setSelected(new Set());
    setPendingApprovalSummary(null);
    setApprovalOpen(false);
    setSendOpen(false);
  };

  const showSendDialog = () => {
    if (selected.size === 0) {
      toast.error("Selecione ao menos um item para enviar a proposta.");
      return;
    }
    setSendOpen(true);
  };

  if (!quote) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onReset={() => {}} />
        <main className="mx-auto max-w-2xl px-4 py-16 text-center">
          <h1 className="text-lg font-bold text-foreground">Cotação não encontrada</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ela pode pertencer a outro tenant ou ter sido removida.
          </p>
          <Button asChild size="sm" className="mt-4">
            <Link to="/inbox">Voltar para a Inbox</Link>
          </Button>
        </main>
      </div>
    );
  }

  const deadline = new Date(quote.sla_deadline);
  const minutesLeft = Math.round((deadline.getTime() - Date.now()) / 60000);

  const quoteValue = quote.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const availableValue = classification?.classified.reduce((sum, item) => {
    if (item.classification === "can_attend") return sum + item.item.unit_price * item.item.quantity;
    if (item.classification === "partial") return sum + item.item.unit_price * item.attendQty;
    return sum;
  }, 0) ?? 0;
  const attendableRate = quoteValue > 0 ? availableValue / quoteValue : 0;
  const attendableTone = attendableRate >= 0.8 ? "bg-emerald-500" : attendableRate >= 0.5 ? "bg-amber-500" : "bg-rose-500";
  const attendableStatus = attendableRate >= 0.8 ? "Excelente" : attendableRate >= 0.5 ? "Moderado" : "Alto risco";
  const attendableAdvice = attendableRate >= 0.8
    ? "Pode responder com confiança."
    : attendableRate >= 0.5
      ? "Revise itens parciais e confirme estoque."
      : "Priorize compras ou renegociação antes de enviar.";

  const goNext = () => {
    if (!next) {
      toast.info("Fila zerada — nenhuma cotação pendente no escopo.");
      return;
    }
    setSelected(new Set());
    navigate({ to: "/cotacao/$id", params: { id: next.id } });
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />

      <main className="mx-auto max-w-[1600px] space-y-3 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Button asChild size="sm" variant="ghost" className="h-8 gap-1.5 text-xs">
              <Link to="/inbox">
                <ArrowLeft className="h-3.5 w-3.5" /> Inbox
              </Link>
            </Button>
            <div>
              <h1 className="text-base font-bold tracking-tight text-foreground">
                Cotação {quote.id}
              </h1>
              <p className="text-[11px] text-muted-foreground">
                {SOURCE_LABEL[quote.source_type]} ·{" "}
                {quote.portal_meta?.portal_reference ?? "sem referência"} ·{" "}
                {STATUS_LABEL[quote.status]}
              </p>
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-4 text-sm text-muted-foreground shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Resumo</div>
                <div className="mt-1 text-base font-semibold text-foreground">{quote.items.length} itens solicitados</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  Valor da cotação: <strong className="text-foreground">{formatBRL(quoteValue)}</strong>
                </div>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryPill label="Podemos atender" value={classification?.summary.canAttend ?? 0} tone="success" />
                <SummaryPill label="Atender parcialmente" value={classification?.summary.partial ?? 0} tone="warning" />
                <SummaryPill label="Sem estoque" value={classification?.summary.noStock ?? 0} tone="danger" />
                <SummaryPill label="Não localizado" value={classification?.summary.notFound ?? 0} tone="muted" />
              </div>
              <div className="mt-3 w-full">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Atendível</span>
                  <span className="font-semibold text-foreground">{formatPct(attendableRate)}</span>
                </div>
                <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-slate-200">
                  <div className={`h-full rounded-full ${attendableTone}`} style={{ width: `${Math.round(attendableRate * 100)}%` }} />
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-semibold">
                  <span className={
                    attendableRate >= 0.8
                      ? "rounded-full bg-emerald-50 px-2 py-1 text-emerald-700"
                      : attendableRate >= 0.5
                        ? "rounded-full bg-amber-50 px-2 py-1 text-amber-700"
                        : "rounded-full bg-rose-50 px-2 py-1 text-rose-700"
                  }>
                    {attendableStatus}
                  </span>
                  <span className="text-muted-foreground">{attendableAdvice}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={
                minutesLeft <= 30
                  ? "inline-flex items-center gap-1 rounded-md bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger"
                  : "inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-semibold text-muted-foreground"
              }
            >
              <Clock className="h-3 w-3" />
              {minutesLeft > 0 ? `${minutesLeft} min restantes` : "SLA vencido"}
            </span>
            <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs" onClick={goNext}>
              Próxima <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <QuoteSummaryBar
          items={quote.items}
          summary={classification?.summary ?? { total: 0, canAttend: 0, partial: 0, noStock: 0, notFound: 0 }}
          selectedItems={selected}
          customerName={quote.customer_name}
          sourceLabel={SOURCE_LABEL[quote.source_type]}
          minMargin={config.min_margin}
          onSendProposal={showSendDialog}
          onSelectAll={() => setSelected(new Set(quote.items.map((_, i) => i)))}
          onSelectRecommended={() => setSelected(new Set(recommended))}
        />
        <SendProposalDialog
          open={sendOpen}
          onOpenChange={setSendOpen}
          quote={quote}
          selectedIndices={selected}
          minMargin={config.min_margin}
          onConfirm={handleSendConfirm}
        />

        <ApprovalRequestDialog
          open={approvalOpen}
          onOpenChange={(open) => {
            if (!open) setPendingApprovalSummary(null);
            setApprovalOpen(open);
          }}
          quoteId={quote.id}
          itemsCount={pendingApprovalSummary?.items.length ?? 0}
          totalValue={pendingApprovalSummary?.revenue ?? 0}
          onRequestApproval={handleRequestApproval}
        />

        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-[11px] text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span>
            A IA recomenda <strong className="text-foreground">{recommended.size}</strong> itens com
            estoque e margem ≥ {formatPct(config.min_margin)}.
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            onClick={() => setSelected(new Set(recommended))}
          >
            Selecionar recomendados
          </Button>
        </div>

        <QuoteItemTable
          items={quote.items}
          allQuotes={quotes}
          minMargin={config.min_margin}
          targetMargin={config.target_margin}
          selectedItems={selected}
          onToggleSelection={(index) =>
            setSelected((prev) => {
              const nextSet = new Set(prev);
              if (nextSet.has(index)) nextSet.delete(index);
              else nextSet.add(index);
              return nextSet;
            })
          }
          onUpdateItem={(index, patch) => updateItem(quote.id, index, patch)}
        />

        <div className="flex justify-end gap-2 pb-6">
          <Button size="sm" variant="outline" className="h-9 text-xs" onClick={goNext}>
            Pular para a próxima
          </Button>
          <Button
            size="sm"
            className="h-9 gap-1.5 text-xs"
            disabled={selected.size === 0}
            onClick={showSendDialog}
          >
            <Send className="h-3.5 w-3.5" /> Enviar proposta ({selected.size})
          </Button>
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}

function SummaryPill({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "warning" | "danger" | "muted";
}) {
  const toneClasses = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-100",
    warning: "bg-amber-50 text-amber-700 border-amber-100",
    danger: "bg-rose-50 text-rose-700 border-rose-100",
    muted: "bg-slate-50 text-slate-700 border-slate-100",
  } as const;

  return (
    <div className={`rounded-2xl border px-3 py-2 text-center text-[11px] font-semibold ${toneClasses[tone]}`}>
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/80">{label}</div>
      <div className="mt-1 text-base text-foreground">{value}</div>
    </div>
  );
}

