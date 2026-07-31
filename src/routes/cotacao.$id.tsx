import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowLeft, ArrowRight, Clock, Send, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { QuoteSummaryBar } from "@/components/medical/quote-summary-bar";
import { QuoteItemTable } from "@/components/medical/quote-item-table";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { useTenantConfig } from "@/hooks/use-tenant-config";
import { classifyItem } from "@/lib/medical/product-matching";
import { itemMargin, formatBRL, formatPct } from "@/lib/medical/pricing";
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

  const quote = quotes.find((q) => q.id === id) ?? null;
  const next = useMemo(() => nextOperationalQuote(quotes, id), [quotes, id]);

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

  const handleSend = () => {
    if (selected.size === 0) return;
    const items = Array.from(selected).map((i) => quote.items[i]);
    const revenue = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
    const cost = items.reduce((s, it) => s + it.cost_price * it.quantity, 0);
    const margin = revenue > 0 ? (revenue - cost) / revenue : 0;
    if (margin < config.min_margin) {
      toast.error(
        `Margem ${formatPct(margin)} abaixo do piso ${formatPct(config.min_margin)} — precisa de aprovação do gerente.`,
      );
      return;
    }
    setStatus(quote.id, "enviado");
    toast.success(
      `Proposta enviada · ${items.length} itens · ${formatBRL(revenue)} · margem ${formatPct(margin)}`,
    );
    setSelected(new Set());
  };

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
          selectedItems={selected}
          customerName={quote.customer_name}
          sourceLabel={SOURCE_LABEL[quote.source_type]}
          minMargin={config.min_margin}
          onSendProposal={handleSend}
          onSelectAll={() => setSelected(new Set(quote.items.map((_, i) => i)))}
          onSelectRecommended={() => setSelected(new Set(recommended))}
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
            onClick={handleSend}
          >
            <Send className="h-3.5 w-3.5" /> Enviar proposta ({selected.size})
          </Button>
        </div>
      </main>

      <Toaster position="top-right" richColors />
    </div>
  );
}
