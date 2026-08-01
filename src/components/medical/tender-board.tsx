import { useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowRight,
  CheckCircle2,
  Gavel,
  MinusCircle,
  PackageOpen,
  Scale,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Quote } from "@/lib/medical/types";
import { SOURCE_LABEL, STATUS_LABEL } from "@/lib/medical/types";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import {
  evaluateTenderEligibility,
  type TenderEligibility,
} from "@/lib/medical/tender-eligibility";
import { operationalQueue } from "@/lib/medical/operational-queue";

type FilterTab = "todas" | "posso_participar" | "participando";

interface Props {
  quotes: Quote[];
  participating: Set<string>;
  onParticipate: (quoteId: string) => void;
  onWithdraw: (quoteId: string) => void;
}

function formatTimeRemaining(deadline: string): string {
  const minutes = Math.round((new Date(deadline).getTime() - Date.now()) / 60000);
  if (minutes < 0) return "Vencido";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function priorityTone(priority: string): string {
  return priority === "urgente"
    ? "bg-danger/10 text-danger"
    : priority === "alta"
      ? "bg-warning/10 text-warning-foreground"
      : "bg-muted/10 text-muted-foreground";
}

function TenderBadge({ eligibility }: { eligibility: TenderEligibility }) {
  const { canParticipate, fullyAttendable, summary } = eligibility;
  if (!canParticipate) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-danger/10 px-2 py-1 text-[11px] font-semibold text-danger">
        <XCircle className="h-3 w-3" />
        Não posso participar
      </div>
    );
  }
  if (fullyAttendable) {
    return (
      <div className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-[11px] font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" />
        Posso atender integralmente
      </div>
    );
  }
  return (
    <div className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-1 text-[11px] font-semibold text-warning-foreground">
      <PackageOpen className="h-3 w-3" />
      Participação parcial
      <span className="ml-0.5 text-[10px] font-medium opacity-80">
        ({summary.canAttend} total · {summary.partial} parcial)
      </span>
    </div>
  );
}

function SummaryChip({
  count,
  tone,
  label,
}: {
  count: number;
  tone: "success" | "warning" | "danger" | "muted";
  label: string;
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning-foreground",
    danger: "bg-danger/10 text-danger",
    muted: "bg-muted/10 text-muted-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold",
        toneClasses[tone],
      )}
    >
      {count} {label}
    </span>
  );
}

export function TenderBoard({ quotes, participating, onParticipate, onWithdraw }: Props) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<FilterTab>("todas");
  const [query, setQuery] = useState("");

  const queue = useMemo(() => operationalQueue(quotes), [quotes]);

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return queue
      .map((quote) => evaluateTenderEligibility(quote))
      .filter((r) => {
        if (tab === "posso_participar" && !r.canParticipate) return false;
        if (tab === "participando" && !participating.has(r.quote.id)) return false;
        if (!needle) return true;
        return (
          r.quote.customer_name.toLowerCase().includes(needle) ||
          r.quote.id.toLowerCase().includes(needle) ||
          r.quote.items.some(
            (i) => i.sku.toLowerCase().includes(needle) || i.name.toLowerCase().includes(needle),
          )
        );
      });
  }, [queue, tab, participating, query]);

  const stats = useMemo(() => {
    const all = queue.map((q) => evaluateTenderEligibility(q));
    const participable = all.filter((r) => r.canParticipate);
    const joined = all.filter((r) => participating.has(r.quote.id));
    const attendableRevenue = participable.reduce((s, r) => s + r.attendableRevenue, 0);
    const potentialRevenue = all.reduce((s, r) => s + r.totalRevenue, 0);
    return {
      total: all.length,
      participable: participable.length,
      joined: joined.length,
      attendableRevenue,
      potentialRevenue,
    };
  }, [queue, participating]);

  const tabCounts = useMemo(() => {
    const all = queue.map((q) => evaluateTenderEligibility(q));
    return {
      todas: all.length,
      posso_participar: all.filter((r) => r.canParticipate).length,
      participando: all.filter((r) => participating.has(r.quote.id)).length,
    };
  }, [queue, participating]);

  return (
    <div className="space-y-4">
      {/* Toolbar: tabs + search */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-1.5">
          {[
            { id: "todas" as const, label: "Todas as cotações", Icon: Gavel },
            { id: "posso_participar" as const, label: "Posso participar", Icon: Scale },
            { id: "participando" as const, label: "Participando", Icon: CheckCircle2 },
          ].map(({ id, label, Icon }) => {
            const active = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                aria-pressed={active}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                <span
                  className={cn(
                    "ml-0.5 rounded-full px-1.5 py-px text-[10px] font-bold tabular-nums",
                    active
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-muted text-foreground/70",
                  )}
                >
                  {tabCounts[id]}
                </span>
              </button>
            );
          })}
        </div>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar cliente, SKU ou ID…"
          className="h-9 w-full rounded-lg border border-input bg-card px-3 text-sm shadow-sm outline-none transition-colors focus:border-primary focus:ring-2 focus:ring-primary/20 lg:w-72"
        />
      </div>

      {/* Stat cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Cotações disponíveis
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">{stats.total}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Posso participar
          </div>
          <div className="mt-1 text-2xl font-semibold text-success">{stats.participable}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Decidi participar
          </div>
          <div className="mt-1 text-2xl font-semibold text-primary">{stats.joined}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card px-4 py-3 shadow-sm">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Receita alcançável
          </div>
          <div className="mt-1 text-2xl font-semibold text-foreground">
            {formatBRL(stats.attendableRevenue)}
          </div>
          <div className="mt-0.5 text-[10px] text-muted-foreground">
            de {formatBRL(stats.potentialRevenue)} potencial
          </div>
        </div>
      </div>

      {/* Empty state */}
      {rows.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card/50 px-4 py-14 text-center">
          <Gavel className="h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm font-semibold text-foreground">Nenhuma cotação nesta visão</p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {tab === "posso_participar"
              ? "No momento não há cotações em que você consiga atender ao menos um item."
              : tab === "participando"
                ? "Você ainda não decidiu participar de nenhuma cotação."
                : "Ajuste a busca para encontrar cotações."}
          </p>
        </div>
      )}

      {/* Tender cards */}
      <div className="space-y-3">
        {rows.map((r) => {
          const quote = r.quote;
          const joined = participating.has(quote.id);
          const canJoin = r.canParticipate;
          const totals = { revenue: r.totalRevenue, attendable: r.attendableRevenue };
          const marginOk = r.attendableMargin >= 0.12;
          return (
            <div
              key={quote.id}
              className={cn(
                "rounded-2xl border bg-card shadow-sm transition-colors",
                joined
                  ? "border-primary/50 ring-1 ring-primary/20"
                  : canJoin
                    ? "border-border hover:border-primary/30"
                    : "border-border opacity-90",
              )}
            >
              <div className="flex flex-wrap items-start justify-between gap-3 p-4">
                {/* Left: identity + eligibility */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                        priorityTone(quote.priority),
                      )}
                    >
                      <span className="h-2 w-2 rounded-full bg-current" />
                      {quote.priority}
                    </span>
                    <Badge variant="outline" className="text-[10px] font-medium">
                      {SOURCE_LABEL[quote.source_type]}
                    </Badge>
                    {joined && (
                      <Badge className="gap-1 bg-primary text-[10px] text-primary-foreground">
                        <CheckCircle2 className="h-3 w-3" /> Participando
                      </Badge>
                    )}
                  </div>
                  <h3 className="mt-2 text-base font-bold text-foreground">
                    {quote.customer_name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground">
                    #{quote.id.toUpperCase()} · {quote.customer_segment} ·{" "}
                    {STATUS_LABEL[quote.status]}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <TenderBadge eligibility={r} />
                  </div>
                </div>

                {/* Right: numbers + action */}
                <div className="flex flex-col items-end gap-2">
                  <div className="text-right">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      Receita atendível
                    </div>
                    <div className="text-lg font-bold tabular-nums text-foreground">
                      {formatBRL(totals.attendable)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      de {formatBRL(totals.revenue)} · margem{" "}
                      <span
                        className={cn("font-semibold", marginOk ? "text-success" : "text-danger")}
                      >
                        {formatPct(r.attendableMargin)}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                    {canJoin ? (
                      joined ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() =>
                              navigate({ to: "/cotacao/$id", params: { id: quote.id } })
                            }
                          >
                            Abrir <ArrowRight className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-8 gap-1 text-[11px] text-danger hover:text-danger"
                            onClick={() => onWithdraw(quote.id)}
                          >
                            <XCircle className="h-3 w-3" /> Não participar
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() => onParticipate(quote.id)}
                          >
                            <CheckCircle2 className="h-3 w-3" /> Participar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-[11px]"
                            onClick={() =>
                              navigate({ to: "/cotacao/$id", params: { id: quote.id } })
                            }
                          >
                            Analisar <ArrowRight className="h-3 w-3" />
                          </Button>
                        </>
                      )
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 gap-1 text-[11px] text-muted-foreground"
                        onClick={() => navigate({ to: "/cotacao/$id", params: { id: quote.id } })}
                      >
                        Ver itens <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Item breakdown */}
              <div className="border-t border-border px-4 py-3">
                <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider">
                    {r.totalItems} itens:
                  </span>
                  <SummaryChip count={r.summary.canAttend} tone="success" label="atender" />
                  <SummaryChip count={r.summary.partial} tone="warning" label="parcial" />
                  <SummaryChip count={r.summary.noStock} tone="danger" label="sem estoque" />
                  <SummaryChip count={r.summary.notFound} tone="muted" label="não localizado" />
                  <span className="ml-auto hidden text-[10px] text-muted-foreground sm:inline">
                    Prazo: {formatTimeRemaining(quote.sla_deadline)}
                  </span>
                </div>
                {!canJoin && r.nonAttendableItems.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    <MinusCircle className="mr-1 inline h-3 w-3" />
                    Nenhum item atendível — não há como participar desta licitação com o
                    estoque/catálogo atual.
                  </p>
                )}
                {canJoin && r.nonAttendableItems.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-muted-foreground">
                    <PackageOpen className="mr-1 inline h-3 w-3" />
                    {r.nonAttendableItems.length} item(ns) fora do seu alcance (sem estoque ou não
                    localizado) ficarão fora da proposta.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
