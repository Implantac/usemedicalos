import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import type { Quote, QuoteStatus } from "@/lib/medical/types";
import { STATUS_LABEL } from "@/lib/medical/types";
import { quoteTotals, formatBRL, formatPct } from "@/lib/medical/pricing";
import { slaState } from "./sla-indicator";
import { PriorityBadge, SourceTag, StatusBadge } from "./badges";
import { SlaIndicator } from "./sla-indicator";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const PRIORITY_RANK = { urgente: 0, alta: 1, normal: 2, baixa: 3 } as const;

interface Props {
  quotes: Quote[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function QuoteInbox({ quotes, selectedId, onSelect }: Props) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<QuoteStatus | "todos">("todos");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return quotes
      .filter((x) => (status === "todos" ? true : x.status === status))
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
  }, [quotes, q, status]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-2 border-b bg-card p-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar cliente, SKU ou ID…"
            className="h-9 pl-8"
          />
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v as QuoteStatus | "todos")}>
          <SelectTrigger className="h-9 w-full sm:w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os status</SelectItem>
            {(Object.keys(STATUS_LABEL) as QuoteStatus[]).map((s) => (
              <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <ul className="flex-1 divide-y overflow-y-auto">
        {filtered.length === 0 && (
          <li className="p-8 text-center text-sm text-muted-foreground">Nenhuma cotação encontrada.</li>
        )}
        {filtered.map((qt) => {
          const totals = quoteTotals(qt.items);
          const active = qt.id === selectedId;
          return (
            <li key={qt.id}>
              <button
                onClick={() => onSelect(qt.id)}
                className={cn(
                  "w-full px-4 py-3 text-left transition-colors hover:bg-accent/40",
                  active && "bg-accent/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-semibold text-foreground">
                        {qt.customer_name}
                      </span>
                      <SourceTag source={qt.source_type} />
                    </div>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      #{qt.id.toUpperCase()} · {qt.customer_segment} · {qt.items.length} item(ns)
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
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
