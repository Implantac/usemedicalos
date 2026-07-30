import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo } from "react";
import { TrendingUp } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { IaInsightBar } from "@/components/medical/ia-insight-bar";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { BenchmarkPanel } from "@/components/medical/benchmark-panel";
import { CalibrationPanel } from "@/components/medical/calibration-panel";
import { RegionalFlywheelPanel } from "@/components/medical/regional-flywheel-panel";
import { useQuotes } from "@/hooks/use-quotes";
import { compareByRegion, consolidatedBenchmark } from "@/lib/medical/benchmarks";
import { formatPct } from "@/lib/medical/pricing";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/inteligencia")({
  head: () => ({
    meta: [
      { title: "Inteligência — USE Medical" },
      {
        name: "description",
        content:
          "Benchmarking anonimizado de margem, ticket e win rate contra a média regional do setor hospitalar.",
      },
    ],
  }),
  component: BiPage,
});

function BiPage() {
  const navigate = useNavigate();
  const { quotes, resetDemo } = useQuotes();
  const rows = useMemo(() => compareByRegion(quotes), [quotes]);
  const consolidated = useMemo(() => consolidatedBenchmark(quotes), [quotes]);

  // IA Insight: comparativo com mercado
  const insightMessage = useMemo(() => {
    if (!consolidated) return "Carregando benchmarks de mercado…";
    const diff = consolidated.avgMargin - 0.12;
    if (diff < 0) {
      return `Sua margem média (${formatPct(consolidated.avgMargin)}) está abaixo da referência de mercado — revisão de preços recomendada`;
    }
    return `Sua margem média (${formatPct(consolidated.avgMargin)}) está saudável comparada ao mercado`;
  }, [consolidated]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Benchmarks anonimizados" />

        <IaInsightBar
          title="IA Comercial"
          message={insightMessage}
          actionLabel="Ver Analytics"
          onAction={() => navigate({ to: "/dashboard", search: { period: 30 } })}
          variant="info"
          icon={<TrendingUp className="h-4 w-4" />}
        />

        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Inteligência
          </h1>
          <p className="text-xs text-muted-foreground">
            Compare sua operação com a média do setor por região. Dados agregados e anonimizados.
          </p>
        </div>
        <BenchmarkPanel rows={rows} consolidated={consolidated} />
        <RegionalFlywheelPanel />
        <CalibrationPanel />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
