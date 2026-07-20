import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppHeader } from "@/components/medical/app-header";
import { TenantScopeBanner } from "@/components/medical/tenant-scope-banner";
import { BenchmarkPanel } from "@/components/medical/benchmark-panel";
import { CalibrationPanel } from "@/components/medical/calibration-panel";
import { useQuotes } from "@/hooks/use-quotes";
import { compareByRegion, consolidatedBenchmark } from "@/lib/medical/benchmarks";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/inteligencia")({
  head: () => ({
    meta: [
      { title: "Inteligência de Mercado — USE Medical" },
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
  const { quotes, resetDemo } = useQuotes();
  const rows = useMemo(() => compareByRegion(quotes), [quotes]);
  const consolidated = useMemo(() => consolidatedBenchmark(quotes), [quotes]);

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={resetDemo} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <TenantScopeBanner hint="Benchmarks anonimizados" />
        <div>
          <h1 className="text-lg font-bold tracking-tight text-foreground">
            Inteligência de mercado
          </h1>
          <p className="text-xs text-muted-foreground">
            Compare sua operação com a média do setor por região. Dados agregados e anonimizados.
          </p>
        </div>
        <BenchmarkPanel rows={rows} consolidated={consolidated} />
        <CalibrationPanel />
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
