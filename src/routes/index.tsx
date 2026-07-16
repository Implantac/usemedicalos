import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { z } from "zod";
import { Plus } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { QuoteInbox } from "@/components/medical/quote-inbox";
import { QuoteDrawer } from "@/components/medical/quote-drawer";
import { QuoteStats } from "@/components/medical/quote-stats";
import { NewQuoteDialog } from "@/components/medical/new-quote-dialog";
import { Button } from "@/components/ui/button";
import { useQuotes } from "@/hooks/use-quotes";
import { Toaster } from "@/components/ui/sonner";

const searchSchema = z.object({
  open: fallback(z.string().optional(), undefined),
});

export const Route = createFileRoute("/")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "USE Medical — Inbox de Cotações" },
      { name: "description", content: "Inbox universal de cotações do distribuidor hospitalar: prioridade automática, precificação com IA e integração TOTVS Protheus." },
    ],
  }),
  component: InboxPage,
});

function InboxPage() {
  const { open } = Route.useSearch();
  const { quotes, addQuote, updateQuote, updateItem, removeItem, resetDemo } = useQuotes();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  useEffect(() => {
    if (open) setSelectedId(open);
  }, [open]);

  const selected = quotes.find((q) => q.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => { setSelectedId(null); resetDemo(); }}>
        <Button
          size="sm"
          onClick={() => setNewOpen(true)}
          className="h-8 gap-1.5 bg-primary-foreground text-primary hover:bg-primary-foreground/90"
        >
          <Plus className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Nova cotação</span>
        </Button>
      </AppHeader>

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
      <NewQuoteDialog open={newOpen} onOpenChange={setNewOpen} onCreate={addQuote} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
