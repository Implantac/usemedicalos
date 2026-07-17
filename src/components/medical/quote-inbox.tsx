import { useMemo, useState } from "react";
import { ArrowRight, Building2, Filter, Search, Undo2, X } from "lucide-react";
import type { Quote, QuoteStatus } from "@/lib/medical/types";
import { STATUS_LABEL } from "@/lib/medical/types";
import { quoteTotals, formatBRL, formatPct } from "@/lib/medical/pricing";
import { nextStatus, prevStatus, slaBucketOf, SLA_LABEL, type SlaBucket } from "@/lib/medical/pipeline";
import { OWNERS, TENANTS, tenantById, ownerById } from "@/lib/medical/mock-data";
import { slaState } from "./sla-indicator";
import { PriorityBadge, SourceTag, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const PRIORITY_RANK = { urgente: 0, alta: 1, normal: 2, baixa: 3 } as const;
const ALL_STATUS = Object.keys(STATUS_LABEL) as QuoteStatus[];

interface Props {
  quotes: Quote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdvance: (id: string, status: QuoteStatus) => void;
}

export function QuoteInbox({ quotes, selectedId, onSelect, onAdvance }: Props) {
  const [q, setQ] = useState("");
  const [tenant, setTenant] = useState<string>("todos");
  const [owner, setOwner] = useState<string>("todos");
  const [sla, setSla] = useState<SlaBucket>("todos");
  const [statuses, setStatuses] = useState<Set<QuoteStatus>>(new Set());

  const toggleStatus = (s: QuoteStatus) => {
    setStatuses((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s); else next.add(s);
      return next;
    });
  };

  const clearFilters = () => {
    setQ(""); setTenant("todos"); setOwner("todos"); setSla("todos"); setStatuses(new Set());
  };

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return quotes
      .filter((x) => tenant === "todos" || x.tenant_id === tenant)
      .filter((x) => owner === "todos" || x.owner_id === owner)
      .filter((x) => statuses.size === 0 || statuses.has(x.status))
      .filter((x) => sla === "todos" || slaBucketOf(x.sla_deadline) === sla)
      .filter((x) =>
        !needle
          ? true
          : x.customer_name.toLowerCase().includes(needle) ||
            x.id.toLowerCase().includes(needle) ||
            x.items.some((i) => i.sku.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle)),
      )
      .sort((a, b) => {
        const pa = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (pa !== 0) return pa;
        return slaState(a.sla_deadline).hours - slaState(b.sla_deadline).hours;
      });
  }, [quotes, q, tenant, owner, sla, statuses]);

  const activeCount =
    (tenant !== "todos" ? 1 : 0) +
    (owner !== "todos" ? 1 : 0) +
    (sla !== "todos" ? 1 : 0) +
    (statuses.size > 0 ? 1 : 0);

  const handleAdvance = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    const ns = nextStatus(qt.status);
    if (!ns) return;
    onAdvance(qt.id, ns);
    toast.success(`${qt.customer_name}: ${STATUS_LABEL[qt.status]} → ${STATUS_LABEL[ns]}`);
  };

  const handleRegress = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    const ps = prevStatus(qt.status);
    if (!ps) return;
    onAdvance(qt.id, ps);
    toast(`${qt.customer_name} regredido para ${STATUS_LABEL[ps]}`);
  };

  const handleLost = (e: React.MouseEvent, qt: Quote) => {
    e.stopPropagation();
    onAdvance(qt.id, "perdido");
    toast.error(`${qt.customer_name} marcado como perdido`);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-2 border-b bg-card p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar cliente, SKU ou ID…"
              className="h-9 pl-8"
            />
          </div>

          <Select value={tenant} onValueChange={setTenant}>
            <SelectTrigger className="h-9 w-full sm:w-52">
              <Building2 className="mr-1.5 h-3.5 w-3.5 opacity-60" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tenants</SelectItem>
              {TENANTS.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={owner} onValueChange={setOwner}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os vendedores</SelectItem>
              {OWNERS.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sla} onValueChange={(v) => setSla(v as SlaBucket)}>
            <SelectTrigger className="h-9 w-full sm:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(SLA_LABEL) as SlaBucket[]).map((s) => (
                <SelectItem key={s} value={s}>{SLA_LABEL[s]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Filter className="h-3 w-3" /> Status
          </span>
          {ALL_STATUS.map((s) => {
            const active = statuses.has(s);
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={cn(
                  "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent",
                )}
              >
                {STATUS_LABEL[s]}
              </button>
            );
          })}
          {activeCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto h-6 gap-1 px-2 text-[11px]"
              onClick={clearFilters}
            >
              <X className="h-3 w-3" /> Limpar ({activeCount})
            </Button>
          )}
          <Badge variant="outline" className="ml-auto text-[11px] font-medium">
            {filtered.length} de {quotes.length}
          </Badge>
        </div>
      </div>

      <ul className="flex-1 divide-y overflow-y-auto">
        {filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">
            Nenhuma cotação encontrada com esses filtros.
          </li>
        )}
        {filtered.map((qt) => {
          const totals = quoteTotals(qt.items);
          const active = qt.id === selectedId;
          const ns = nextStatus(qt.status);
          const ps = prevStatus(qt.status);
          const t = tenantById(qt.tenant_id);
          const ow = ownerById(qt.owner_id);
          return (
            <li key={qt.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onSelect(qt.id)}
                onKeyDown={(e) => (e.key === "Enter" ? onSelect(qt.id) : null)}
                className={cn(
                  "w-full cursor-pointer px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  active && "bg-accent/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {qt.customer_name}
                      </span>
                      <SourceTag source={qt.source_type} />
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                        <Building2 className="h-3 w-3" /> {t.name}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      #{qt.id.toUpperCase()} · {qt.customer_segment} · {ow.name} · {qt.items.length} item(ns)
                    </p>
                  </div>
                  <SlaIndicator deadline={qt.sla_deadline} compact />
                </div>

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <PriorityBadge priority={qt.priority} />
                    <StatusBadge status={qt.status} />
                  </div>
                  <div className="num text-right">
                    <div className="text-sm font-semibold text-foreground">{formatBRL(totals.revenue)}</div>
                    <div className={cn(
                      "text-[11px] font-medium",
                      totals.margin < 0.12 ? "text-danger" : "text-success",
                    )}>
                      margem {formatPct(totals.margin)}
                    </div>
                  </div>
                </div>

                {(ns || ps) && (
                  <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t pt-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Ações rápidas
                    </span>
                    {ns && (
                      <Button
                        size="sm"
                        variant="default"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={(e) => handleAdvance(e, qt)}
                      >
                        Avançar → {STATUS_LABEL[ns]} <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                    {ps && qt.status !== "aguardando_precificacao" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px]"
                        onClick={(e) => handleRegress(e, qt)}
                      >
                        <Undo2 className="h-3 w-3" /> Voltar
                      </Button>
                    )}
                    {qt.status !== "ganho" && qt.status !== "perdido" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 gap-1 px-2 text-[11px] text-danger hover:text-danger"
                        onClick={(e) => handleLost(e, qt)}
                      >
                        Marcar perdido
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
