import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, Cloud, ExternalLink, Package, Store } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { PermissionGate } from "@/components/medical/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Toaster } from "@/components/ui/sonner";
import {
  CATEGORY_LABEL,
  MARKETPLACE,
  isInstalled,
  listInstalled,
  setInstalled,
  type MarketplaceCategory,
  type MarketplaceItem,
} from "@/lib/medical/marketplace";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace de integrações — USE Medical" },
      { name: "description", content: "Catálogo unificado de conectores: ERPs, portais de RFQ, comunicação e IA. Instale em um clique." },
      { property: "og:title", content: "Marketplace de integrações — USE Medical" },
      { property: "og:description", content: "Bionexo, Apoio, TOTVS, Sankhya, WhatsApp e mais no mesmo lugar." },
    ],
  }),
  component: MarketplacePage,
});

const CATEGORIES: (MarketplaceCategory | "all")[] = ["all", "erp", "portal", "comunicacao", "ia", "logistica"];

const STATUS_STYLE: Record<MarketplaceItem["status"], string> = {
  estavel: "border-success/40 bg-success/10 text-success",
  beta: "border-brand/40 bg-brand/10 text-brand",
  planejado: "border-muted-foreground/30 bg-muted text-muted-foreground",
};

function MarketplacePage() {
  return (
    <PermissionGate perm="integrations.manage" title="Marketplace restrito">
      <MarketplaceInner />
    </PermissionGate>
  );
}

function MarketplaceInner() {
  const [cat, setCat] = useState<(MarketplaceCategory | "all")>("all");
  const [q, setQ] = useState("");
  const [installed, setInstalledState] = useState<string[]>([]);

  useEffect(() => {
    setInstalledState(listInstalled());
    const on = () => setInstalledState(listInstalled());
    window.addEventListener("use-medical:marketplace:change", on);
    return () => window.removeEventListener("use-medical:marketplace:change", on);
  }, []);

  const items = MARKETPLACE.filter((it) => (cat === "all" ? true : it.category === cat)).filter(
    (it) => {
      if (!q.trim()) return true;
      const needle = q.toLowerCase();
      return (
        it.name.toLowerCase().includes(needle) ||
        it.vendor.toLowerCase().includes(needle) ||
        it.short.toLowerCase().includes(needle)
      );
    },
  );

  function toggle(item: MarketplaceItem) {
    if (item.status === "planejado") {
      toast.info(`${item.name} ainda não está disponível. Registramos seu interesse.`);
      return;
    }
    const next = !isInstalled(item.id);
    setInstalled(item.id, next);
    toast[next ? "success" : "info"](`${item.name} ${next ? "instalado" : "desinstalado"}`);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
              <Store className="h-5 w-5 text-brand" /> Marketplace de integrações
            </h1>
            <p className="text-xs text-muted-foreground">
              Cada conector já vem com preset, monitoramento e ingestão assinada. Nada de adaptador ad-hoc.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar conector…"
              className="h-8 w-56 text-xs"
            />
            <Badge variant="outline" className="text-[10px]">
              {installed.length} instalado(s)
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 card-shadow">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              onClick={() => setCat(c)}
              className={cn(
                "rounded px-3 py-1.5 text-xs font-medium transition-colors",
                cat === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted",
              )}
            >
              {c === "all" ? "Todos" : CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((it) => {
            const installedNow = installed.includes(it.id);
            return (
              <div key={it.id} className="flex flex-col rounded-lg border bg-card p-4 card-shadow">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-brand" />
                      <h3 className="truncate text-sm font-semibold text-foreground">{it.name}</h3>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {it.vendor} · {CATEGORY_LABEL[it.category]}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider",
                      STATUS_STYLE[it.status],
                    )}
                  >
                    {it.status}
                  </span>
                </div>

                <p className="mt-2 text-xs text-foreground">{it.short}</p>
                <p className="mt-1 text-[11px] text-muted-foreground">{it.description}</p>

                <ul className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
                  {it.value_props.map((v) => (
                    <li key={v} className="flex items-start gap-1.5">
                      <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-success" />
                      <span>{v}</span>
                    </li>
                  ))}
                </ul>

                {it.requires_cloud && (
                  <div className="mt-2 flex items-center gap-1 rounded border border-dashed border-brand/40 bg-brand/5 px-2 py-1 text-[10px] text-brand">
                    <Cloud className="h-3 w-3" /> Requer Lovable Cloud ativo
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={installedNow ? "outline" : "default"}
                    disabled={it.status === "planejado"}
                    onClick={() => toggle(it)}
                  >
                    {it.status === "planejado" ? "Em breve" : installedNow ? "Instalado" : "Instalar"}
                  </Button>
                  {it.route && (
                    <Button asChild size="sm" variant="ghost">
                      <Link to={it.route}>Abrir</Link>
                    </Button>
                  )}
                  {it.docs_url && (
                    <a
                      href={it.docs_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                    >
                      Docs <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {items.length === 0 && (
          <div className="rounded-lg border border-dashed p-8 text-center text-xs text-muted-foreground">
            Nenhum conector para esse filtro.
          </div>
        )}
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
