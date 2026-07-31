import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { Activity, ArrowRight, Clock, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/hooks/use-quotes";
import { operationalQueue } from "@/lib/medical/operational-queue";
import { classifyQuoteItems } from "@/lib/medical/product-matching";
import { quoteTotals, formatBRL } from "@/lib/medical/pricing";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/medical/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/cotacao/")({
  head: () => ({
    meta: [
      { title: "Central de Cotações — USE Medical" },
      {
        name: "description",
        content:
          "Central de cotações operacional: priorize, analise por item, selecione o que atende e responda sem sair da USE Medical.",
      },
      { property: "og:title", content: "Central de Cotações — USE Medical" },
      {
        property: "og:description",
        content:
          "Uma fila inteligente de cotações com SLA, origem, valor e status para o vendedor trabalhar na operação.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationalQueuePage,
});

function formatTimeRemaining(deadline: string) {
  const minutes = Math.round((new Date(deadline).getTime() - Date.now()) / 60000);
  if (minutes < 0) return "Vencido";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function priorityTone(priority: string) {
  return priority === "urgente"
    ? "bg-danger/10 text-danger"
    : priority === "alta"
    ? "bg-warning/10 text-warning-foreground"
    : "bg-muted/10 text-muted-foreground";
}

function OperationalQueuePage() {
  const navigate = useNavigate();
  const { quotes } = useQuotes();
  const queue = useMemo(() => operationalQueue(quotes), [quotes]);

  const totals = useMemo(
    () =>
      queue.reduce(
        (acc, quote) => {
          const quoteItems = quoteTotals(quote.items);
          const summary = classifyQuoteItems(quote.items).summary;
          acc.quotes += 1;
          acc.items += quote.items.length;
          acc.revenue += quoteItems.revenue;
          acc.canAttend += summary.canAttend;
          acc.partial += summary.partial;
          acc.noStock += summary.noStock;
          acc.notFound += summary.notFound;
          return acc;
        },
        {
          quotes: 0,
          items: 0,
          revenue: 0,
          canAttend: 0,
          partial: 0,
          noStock: 0,
          notFound: 0,
        },
      ),
    [queue],
  );

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <div className="mb-6 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">
                <Sparkles className="h-4 w-4 text-primary" /> CENTRAL DE COTAÇÕES
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">Sua fila operacional de vendas</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Eu recebi {totals.items} itens em {totals.quotes} cotações. Quero descobrir rapidamente o que consigo vender, quanto devo cobrar, responder e acompanhar o resultado sem sair da USE Medical.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" className="h-10" onClick={() => navigate({ to: "/inbox" })}>
                Ir para Inbox
              </Button>
              <Button
                size="sm"
                className="h-10"
                disabled={queue.length === 0}
                onClick={() => queue.length && navigate({ to: "/cotacao/$id", params: { id: queue[0].id } })}
              >
                Abrir próxima
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-4">
            <Stat label="Cotações" value={String(totals.quotes)} />
            <Stat label="Itens recebidos" value={String(totals.items)} />
            <Stat label="Valor potencial" value={formatBRL(totals.revenue)} />
            <Stat label="Atendíveis" value={`${totals.canAttend} / ${totals.items}`} />
          </div>
        </div>

        <div className="grid gap-3 xl:grid-cols-[1fr_320px]">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <div className="border-b border-border px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-base font-bold text-foreground">Fila inteligente</h2>
                  <p className="text-sm text-muted-foreground">Ordenada por urgência de SLA e valor potencial.</p>
                </div>
                <div className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {queue.length} cotações
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-background text-[10px] uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Prioridade</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Origem</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Cliente</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Itens</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Prazo</th>
                    <th className="whitespace-nowrap px-4 py-3 text-right">Valor</th>
                    <th className="whitespace-nowrap px-4 py-3 text-left">Status</th>
                    <th className="whitespace-nowrap px-4 py-3 text-center">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((quote) => {
                    const totals = quoteTotals(quote.items);
                    const summary = classifyQuoteItems(quote.items).summary;
                    return (
                      <tr key={quote.id} className="border-t border-border hover:bg-primary/5">
                        <td className="whitespace-nowrap px-4 py-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                              priorityTone(quote.priority),
                            )}
                          >
                            <span className="h-2.5 w-2.5 rounded-full bg-current" />
                            {quote.priority}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-foreground">
                          {SOURCE_LABEL[quote.source_type]}
                        </td>
                        <td className="min-w-45 px-4 py-4">
                          <div className="font-semibold text-foreground">{quote.customer_name}</div>
                          <div className="text-[11px] text-muted-foreground">{quote.customer_segment}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-foreground">{quote.items.length}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right text-muted-foreground">{formatTimeRemaining(quote.sla_deadline)}</td>
                        <td className="whitespace-nowrap px-4 py-4 text-right font-semibold text-foreground">{formatBRL(totals.revenue)}</td>
                        <td className="px-4 py-4">
                          <div className="rounded-full bg-muted px-2 py-1 text-[11px] font-semibold text-foreground">
                            {STATUS_LABEL[quote.status]}
                          </div>
                          <div className="mt-1 text-[10px] text-muted-foreground">
                            {summary.canAttend} atender · {summary.partial} parcial
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 px-3 text-[11px]"
                            onClick={() => navigate({ to: "/cotacao/$id", params: { id: quote.id } })}
                          >
                            Abrir
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <aside className="space-y-3">
            <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-foreground">Resumo rápido</h2>
              <div className="mt-4 space-y-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between">
                  <span>Itens atendíveis</span>
                  <span className="font-semibold text-foreground">{totals.canAttend}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Itens parciais</span>
                  <span className="font-semibold text-foreground">{totals.partial}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Sem estoque</span>
                  <span className="font-semibold text-foreground">{totals.noStock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Não localizados</span>
                  <span className="font-semibold text-foreground">{totals.notFound}</span>
                </div>
              </div>
            </section>
            <section className="rounded-3xl border border-border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.2em] text-muted-foreground">
                <Activity className="h-4 w-4" /> Operação
              </div>
              <div className="mt-3 text-sm leading-6 text-muted-foreground">
                Priorize responder cotações com SLA mais curto e maior potencial. Ao abrir uma cotação, selecione os itens que consegue atender, ajuste preços e envie a proposta diretamente.
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-border bg-background px-4 py-4 text-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div className="mt-2 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  );
}
