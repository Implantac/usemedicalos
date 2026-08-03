/**
 * Workspace de Cotação Operacional
 * 
 * Foca na "bancada de trabalho do vendedor".
 * O vendedor trabalha item a item, validando estoque, margem e histórico.
 */

import { useState, useMemo } from "react";
import { 
  ArrowLeft, 
  ChevronLeft, 
  ChevronRight, 
  Send, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  LayoutGrid,
  List
} from "lucide-react";
import { Link, useParams, useNavigate } from "@tanstack/react-router";
import { useQuotes } from "@/hooks/use-quotes";
import { Button } from "@/components/ui/button";
import { QuoteItemTable } from "@/components/medical/quote-item-table";
import { QuoteSummaryBar } from "@/components/medical/quote-summary-bar";
import { formatBRL } from "@/lib/medical/pricing";
import { useActiveTenant } from "@/hooks/use-active-tenant";
import { toast } from "sonner";

export default function OperationalQuotePage() {
  const { id } = useParams({ from: "/cotacao/$id" });
  const navigate = useNavigate();
  const { quotes, updateQuote, resetDemo } = useQuotes();
  const { tenant } = useActiveTenant();
  
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = useState<"compact" | "detailed">("detailed");

  const quote = useMemo(() => quotes.find((q) => q.id === id), [quotes, id]);
  
  if (!quote) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">Cotação não encontrada.</p>
          <Link to="/inbox" className="mt-4 text-primary underline">Voltar para Inbox</Link>
        </div>
      </div>
    );
  }

  const handleUpdateItem = (index: number, patch: any) => {
    const newItems = [...quote.items];
    newItems[index] = { ...newItems[index], ...patch };
    updateQuote(quote.id, { items: newItems });
  };

  const toggleSelection = (index: number) => {
    const next = new Set(selectedItems);
    if (next.has(index)) next.delete(index);
    else next.add(index);
    setSelectedItems(next);
  };

  const selectRecommended = () => {
    const recommended = new Set<number>();
    quote.items.forEach((_, idx) => {
      // Simplificação: seleciona o que tem estoque (mock)
      if (idx % 2 === 0) recommended.add(idx);
    });
    setSelectedItems(recommended);
    toast.success(`${recommended.size} itens recomendados pela IA selecionados.`);
  };

  const handleSend = () => {
    if (selectedItems.size === 0) {
      toast.error("Selecione ao menos um item para enviar.");
      return;
    }
    toast.success("Proposta enviada com sucesso!");
    // Simulando navegação para "Próxima"
    const currentIndex = quotes.findIndex(q => q.id === id);
    const nextQuote = quotes[currentIndex + 1];
    if (nextQuote) {
      navigate({ to: "/cotacao/$id", params: { id: nextQuote.id } });
    } else {
      navigate({ to: "/inbox" });
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header Operacional */}
      <header className="sticky top-0 z-20 border-b bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/inbox" className="rounded-full p-1 hover:bg-accent transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-foreground">
                  {quote.customer_name}
                </h1>
                <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground">
                  #{quote.id}
                </span>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                <span>Origem: <b className="text-foreground">{quote.platform || "Bionexo"}</b></span>
                <span>•</span>
                <span>Prazo: <b className="text-danger">{new Date(quote.sla_deadline).toLocaleTimeString()}</b></span>
                <span>•</span>
                <span>{quote.items.length} itens</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
             <Button 
              variant="outline" 
              size="sm" 
              className="hidden sm:flex gap-1.5"
              onClick={selectRecommended}
            >
              <Zap className="h-3.5 w-3.5 text-primary fill-primary/20" />
              IA Sugeridos
            </Button>
            
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8"
              onClick={() => setViewMode(v => v === "detailed" ? "compact" : "detailed")}
            >
              {viewMode === "detailed" ? <LayoutGrid className="h-4 w-4" /> : <List className="h-4 w-4" />}
            </Button>

            <div className="flex items-center gap-1 ml-2">
               <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronLeft className="h-4 w-4" />
              </Button>
               <Button variant="outline" size="icon" className="h-8 w-8">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] flex-1 p-4 pb-24">
        <div className="grid gap-6">
          <QuoteItemTable 
            items={quote.items}
            allQuotes={quotes}
            onUpdateItem={handleUpdateItem}
            onToggleSelection={toggleSelection}
            selectedItems={selectedItems}
            minMargin={tenant?.min_margin || 0.12}
            targetMargin={tenant?.target_margin || 0.18}
          />
        </div>
      </main>

      {/* Action Bar Inferior - Sticky */}
      <footer className="fixed bottom-0 left-0 right-0 z-30 border-t bg-card/95 backdrop-blur-sm p-4 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] md:left-[240px]">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4">
          <QuoteSummaryBar 
            selectedItemsCount={selectedItems.size}
            totalItemsCount={quote.items.length}
            items={quote.items}
            selectedIndices={selectedItems}
          />
          
          <div className="flex items-center gap-3">
             <Button variant="outline" className="hidden sm:flex">
              Salvar Rascunho
            </Button>
            <Button 
              className="gap-2 bg-success hover:bg-success/90" 
              disabled={selectedItems.size === 0}
              onClick={handleSend}
            >
              <Send className="h-4 w-4" />
              Enviar Proposta
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
