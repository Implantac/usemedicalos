import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Gavel, Sparkles } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenderBoard } from "@/components/medical/tender-board";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/hooks/use-quotes";
import { useTenderParticipation } from "@/hooks/use-tender-participation";
import { evaluateTenderEligibilityForQuotes } from "@/lib/medical/tender-eligibility";
import { operationalQueue } from "@/lib/medical/operational-queue";
import { formatBRL } from "@/lib/medical/pricing";

export const Route = createFileRoute("/cotacao/")({
  head: () => ({
    meta: [
      { title: "Central de Cotações — USE Medical" },
      {
        name: "description",
        content:
          "Painel de licitações: veja todas as cotações disponíveis, descubra em quais você consegue participar e decida se participa — como em uma licitação real.",
      },
      { property: "og:title", content: "Central de Cotações — USE Medical" },
      {
        property: "og:description",
        content:
          "Cada cotação pode conter vários produtos. O sistema mostra o que você consegue atender (estoque, margem, catálogo) e você decide participar ou não.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationalQueuePage,
});

function OperationalQueuePage() {
  const { quotes } = useQuotes();
  const { participating, hydrated, participate, withdraw, participateMany } =
    useTenderParticipation();

  const queue = useMemo(() => operationalQueue(quotes), [quotes]);

  const totals = useMemo(() => {
    const rows = evaluateTenderEligibilityForQuotes(queue);
    const participable = rows.filter((r) => r.canParticipate);
    return {
      quotes: queue.length,
      items: queue.reduce((s, q) => s + q.items.length, 0),
      participable: participable.length,
      participating: queue.filter((q) => participating.has(q.id)).length,
      attendableRevenue: participable.reduce((s, r) => s + r.attendableRevenue, 0),
      totalRevenue: queue.reduce(
        (s, q) => s + q.items.reduce((a, i) => a + i.unit_price * i.quantity, 0),
        0,
      ),
    };
  }, [queue, participating]);

  const handleParticipateAll = () => {
    const participableIds = queue.map((q) => q.id).filter((id) => !participating.has(id));
    if (participableIds.length > 0) participateMany(participableIds);
  };

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
              <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground">
                Painel de licitações
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground">
                Veja todas as cotações disponíveis e descubra em quais você{" "}
                <strong className="text-foreground">consegue participar</strong>. Uma cotação pode
                ter vários produtos — por isso você avalia item por item (estoque, margem, catálogo)
                e decide participar ou não, como em uma licitação real.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-10"
                onClick={handleParticipateAll}
                disabled={!hydrated || queue.length === 0}
              >
                <Gavel className="h-4 w-4" /> Participar de todas elegíveis
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <Stat label="Cotações disponíveis" value={String(totals.quotes)} />
            <Stat label="Itens recebidos" value={String(totals.items)} />
            <Stat label="Posso participar" value={String(totals.participable)} tone="success" />
            <Stat label="Decidi participar" value={String(totals.participating)} tone="primary" />
            <Stat label="Receita alcançável" value={formatBRL(totals.attendableRevenue)} />
          </div>
        </div>

        <TenderBoard
          quotes={quotes}
          participating={participating}
          onParticipate={participate}
          onWithdraw={withdraw}
        />
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "primary";
}) {
  return (
    <div className="rounded-3xl border border-border bg-background px-4 py-4 text-sm">
      <div className="text-xs uppercase tracking-[0.2em] text-muted-foreground">{label}</div>
      <div
        className={
          tone === "success"
            ? "mt-2 text-2xl font-semibold text-success"
            : tone === "primary"
              ? "mt-2 text-2xl font-semibold text-primary"
              : "mt-2 text-2xl font-semibold text-foreground"
        }
      >
        {value}
      </div>
    </div>
  );
}
