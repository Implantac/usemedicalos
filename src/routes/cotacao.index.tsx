import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo } from "react";
import { AppHeader } from "@/components/medical/app-header";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/hooks/use-quotes";
import { operationalQueue } from "@/lib/medical/operational-queue";

export const Route = createFileRoute("/cotacao/")({
  head: () => ({
    meta: [
      { title: "Modo produção comercial — USE Medical" },
      {
        name: "description",
        content:
          "Fila inteligente de cotações: a USE Medical abre automaticamente a próxima cotação prioritária para responder.",
      },
      { property: "og:title", content: "Modo produção comercial — USE Medical" },
      {
        property: "og:description",
        content: "Trabalhe cotação após cotação em linha de produção: itens, preço, envio, próxima.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OperationalQueuePage,
});

function OperationalQueuePage() {
  const navigate = useNavigate();
  const { quotes } = useQuotes();
  const queue = useMemo(() => operationalQueue(quotes), [quotes]);

  useEffect(() => {
    if (queue.length > 0) {
      navigate({ to: "/cotacao/$id", params: { id: queue[0].id }, replace: true });
    }
  }, [queue, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-lg font-bold text-foreground">
          {queue.length > 0 ? "Abrindo a próxima cotação…" : "Fila zerada"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {queue.length > 0
            ? "Priorizando por SLA e valor potencial."
            : "Nenhuma cotação aberta no escopo atual."}
        </p>
        <Button asChild size="sm" variant="outline" className="mt-4">
          <Link to="/inbox">Ir para a Inbox</Link>
        </Button>
      </main>
    </div>
  );
}
