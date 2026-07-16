import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppHeader } from "@/components/medical/app-header";
import { QuoteInbox } from "@/components/medical/quote-inbox";
import { QuoteDrawer } from "@/components/medical/quote-drawer";
import { QuoteStats } from "@/components/medical/quote-stats";
import { useQuotes } from "@/hooks/use-quotes";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "USE Medical — Inbox de Cotações" },
      { name: "description", content: "Sistema operacional comercial para distribuidores hospitalares. Inbox universal de cotações, precificação com IA e integração TOTVS Protheus." },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { quotes, updateQuote, updateItem, removeItem, resetDemo } = useQuotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = quotes.find((q) => q.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => { setSelectedId(null); resetDemo(); }} />

      <main className="mx-auto max-w-[1600px] px-3 py-4 sm:px-4">
        <div className="mb-4 space-y-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Inbox Universal</h1>
            <p className="text-xs text-muted-foreground">
              Cotações ordenadas por urgência e SLA. Clique para precificar e enviar.
            </p>
          </div>
          <QuoteStats quotes={quotes} />
        </div>

        <div className="overflow-hidden rounded-lg border bg-card card-shadow">
          <QuoteInbox quotes={quotes} selectedId={selectedId} onSelect={setSelectedId} />
        </div>
      </main>

      <QuoteDrawer
        quote={selected}
        onClose={() => setSelectedId(null)}
        onUpdateItem={updateItem}
        onRemoveItem={removeItem}
        onUpdateQuote={updateQuote}
      />
      <Toaster position="top-right" richColors />
    </div>
  );
}
