import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PermissionGate } from "@/components/medical/permission-gate";
import { useMemo, useState } from "react";
import { Search, TrendingUp, AlertTriangle } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { IaInsightBar } from "@/components/medical/ia-insight-bar";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { ProductList } from "@/components/medical/product-list";
import { ProductHistoryDrawer } from "@/components/medical/product-history-drawer";
import { Input } from "@/components/ui/input";
import { useQuotes } from "@/hooks/use-quotes";
import { useProductOverrides } from "@/hooks/use-product-overrides";
import { PRODUCTS } from "@/lib/medical/mock-data";
import { enrichProductsWithMarket, computeMarketAverages } from "@/lib/medical/pricing-flywheel";
import { formatPct } from "@/lib/medical/pricing";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Catálogo — USE Medical" },
      { name: "description", content: "Catálogo de produtos hospitalares com motor de precificação de 4 camadas (floor, CMED, mercado, estratégia) e governança regulatória." },
    ],
  }),
  component: () => (
    <PermissionGate perm="pricing.governance" title="Produtos restrito">
      <ProdutosPage />
    </PermissionGate>
  ),
});

function ProdutosPage() {
  const navigate = useNavigate();
  const { quotes, resetDemo } = useQuotes();
  const { applyTo } = useProductOverrides();
  const [q, setQ] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Camadas: overrides do gestor sobre catálogo base, depois flywheel atualiza market_avg
  const enriched = useMemo(() => {
    const withOverrides = PRODUCTS.map(applyTo);
    return enrichProductsWithMarket(withOverrides, quotes);
  }, [applyTo, quotes]);

  const flywheelStats = useMemo(() => computeMarketAverages(quotes), [quotes]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return enriched.filter(
      (p) => !s || p.name.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s),
    );
  }, [enriched, q]);

  const selected = enriched.find((p) => p.id === selectedId) ?? null;

  // IA Insight: produtos com margem abaixo do ideal
  const lowMarginProducts = useMemo(() => {
    return enriched.filter((p) => {
      const margin = (p.last_suggested_price - p.cost_price) / p.last_suggested_price;
      return margin < 0.12;
    });
  }, [enriched]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />

      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Catálogo compartilhado entre tenants" />

        {/* IA Insight — alerta de margem */}
        {lowMarginProducts.length > 0 && (
          <IaInsightBar
            title="IA Comercial"
            message={`${lowMarginProducts.length} produto(s) com margem abaixo de 12% — revisão recomendada`}
            subtitle="Margens apertadas comprometem a rentabilidade da operação"
            actionLabel="Ver produtos"
            onAction={() => {
              const first = lowMarginProducts[0];
              if (first) setSelectedId(first.id);
            }}
            variant="warning"
            icon={<AlertTriangle className="h-4 w-4" />}
          />
        )}

        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Catálogo de produtos</h1>
            <p className="text-xs text-muted-foreground">
              {PRODUCTS.length} itens · motor de precificação em 4 camadas ativo.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 rounded-md border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] text-primary">
            <TrendingUp className="h-3 w-3" />
            <span className="font-semibold">Flywheel</span>
            <span className="text-muted-foreground">
              {flywheelStats.size} SKU{flywheelStats.size === 1 ? "" : "s"} com preço médio real
            </span>
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
