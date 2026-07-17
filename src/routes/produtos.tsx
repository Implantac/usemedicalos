import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { ProductList } from "@/components/medical/product-list";
import { ProductHistoryDrawer } from "@/components/medical/product-history-drawer";
import { Input } from "@/components/ui/input";
import { useQuotes } from "@/hooks/use-quotes";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Catálogo — USE Medical" },
      { name: "description", content: "Catálogo de produtos hospitalares com custo, último preço praticado, margem e histórico por cliente." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const { quotes, resetDemo } = useQuotes();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return PRODUCTS.filter(
      (p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s),
    );
  }, [q]);

  const selected = PRODUCTS.find((p) => p.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Catálogo compartilhado entre tenants" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">Catálogo de produtos</h1>
          <p className="text-xs text-muted-foreground">
            {PRODUCTS.length} itens · clique para ver histórico de preços praticados e sugestão IA.
          </p>
        </div>

        <div className="relative max-w-md">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nome ou SKU…"
            className="h-9 pl-8"
          />
        </div>

        <ProductList products={filtered} quotes={quotes} selectedId={selectedId} onSelect={setSelectedId} />
      </main>

      <ProductHistoryDrawer product={selected} quotes={quotes} onClose={() => setSelectedId(null)} />
      <Toaster position="top-right" richColors />
    </div>
  );
}
