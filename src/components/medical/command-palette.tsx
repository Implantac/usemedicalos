import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Cloud,
  FileSearch,
  Gauge,
  Inbox,
  KeyRound,
  LayoutDashboard,
  LineChart,
  Package,
  Plug,
  Radio,
  Shield,
  ShieldAlert,
  ShieldCheck,
  FileText,
  Building2,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import type { Quote } from "@/lib/medical/types";
import { STATUS_LABEL } from "@/lib/medical/types";
import { TENANTS } from "@/lib/medical/mock-data";

const NAV_ITEMS = [
  { to: "/", label: "Inbox", icon: Inbox, keywords: "cotacoes rfq caixa" },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, keywords: "kpi metricas" },
  { to: "/executivo", label: "Painel Executivo", icon: Gauge, keywords: "gestor c-level" },
  { to: "/sla-watchdog", label: "SLA Watchdog", icon: Radio, keywords: "prazo atraso" },
  { to: "/produtos", label: "Produtos", icon: Package, keywords: "catalogo sku" },
  { to: "/inteligencia", label: "Inteligência", icon: LineChart, keywords: "analytics benchmarks" },
  { to: "/integracoes", label: "Integrações", icon: Plug, keywords: "erp use sistemas totvs" },
  { to: "/api-keys", label: "API Keys", icon: KeyRound, keywords: "tokens webhook" },
  { to: "/excecoes", label: "Exceções", icon: ShieldCheck, keywords: "compliance override" },
  { to: "/compliance", label: "Compliance", icon: ShieldCheck, keywords: "anvisa cmed" },
  { to: "/governanca", label: "Governança", icon: Shield, keywords: "papeis permissoes rbac" },
  { to: "/auditoria", label: "Auditoria", icon: FileSearch, keywords: "log hash chain" },
  { to: "/quarentena", label: "Quarentena", icon: ShieldAlert, keywords: "erro payload" },
  { to: "/cloud-readiness", label: "Cloud Readiness", icon: Cloud, keywords: "supabase migracao" },
] as const;

const QUOTES_STORAGE_KEY = "use-medical:quotes:v2";

function readQuotes(): Quote[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(QUOTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Quote[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Command Palette global (⌘K / Ctrl+K).
 * Busca unificada por rotas, cotações (id/cliente/status) e tenants.
 * Reduz carga cognitiva de navegação no Commercial OS.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const navigate = useNavigate();

  // Atalho global ⌘K / Ctrl+K
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Recarrega quotes ao abrir (snapshot barato, evita hook de estado global aqui).
  useEffect(() => {
    if (open) setQuotes(readQuotes());
  }, [open]);

  const topQuotes = useMemo(() => {
    return [...quotes]
      .sort((a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime())
      .slice(0, 20);
  }, [quotes]);

  const go = useCallback(
    (to: string) => {
      setOpen(false);
      // navigate exige tipagem de rota; cast seguro pois vem de NAV_ITEMS estáticos.
      void navigate({ to: to as "/" });
    },
    [navigate],
  );

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar cotação, cliente, rota ou tenant..." />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>

        <CommandGroup heading="Navegação">
          {NAV_ITEMS.map((n) => {
            const Icon = n.icon;
            return (
              <CommandItem
                key={n.to}
                value={`${n.label} ${n.keywords}`}
                onSelect={() => go(n.to)}
              >
                <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{n.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>

        {topQuotes.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Cotações recentes">
              {topQuotes.map((q) => (
                <CommandItem
                  key={q.id}
                  value={`${q.id} ${q.customer_name} ${q.customer_segment} ${q.status}`}
                  onSelect={() => go("/")}
                >
                  <FileText className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium">{q.customer_name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        #{q.id.slice(0, 8)} · {q.customer_segment}
                      </div>
                    </div>
                    <CommandShortcut className="text-[10px] uppercase tracking-wider">
                      {STATUS_LABEL[q.status]}
                    </CommandShortcut>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Tenants">
          {TENANTS.map((t) => (
            <CommandItem
              key={t.id}
              value={`tenant ${t.name} ${t.cnpj}`}
              onSelect={() => {
                try {
                  window.localStorage.setItem("use-medical:active-tenant", t.id);
                  window.dispatchEvent(
                    new CustomEvent("use-medical:active-tenant:change", { detail: t.id }),
                  );
                } catch {
                  // ignore
                }
                go("/");
              }}
            >
              <Building2 className="mr-2 h-4 w-4 text-muted-foreground" />
              <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
                <span className="truncate text-sm">{t.name}</span>
                <span className="text-[11px] text-muted-foreground">{t.region ?? t.erp_type}</span>
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
