import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, GitFork, Radar, Sparkles, Users } from "lucide-react";
import { AppHeader } from "@/components/medical/app-header";
import { PermissionGate } from "@/components/medical/permission-gate";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Toaster } from "@/components/ui/sonner";
import { useQuotes } from "@/hooks/use-quotes";
import { OWNERS, ownerById } from "@/lib/medical/mock-data";
import {
  buildOwnerLoad,
  buildOwnerSpecialty,
  planAutoAssignments,
  splitLargeQuote,
  suggestOwner,
} from "@/lib/medical/orchestration";
import { quoteTotals } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/orquestracao")({
  head: () => ({
    meta: [
      { title: "Orquestração comercial — USE Medical" },
      { name: "description", content: "Roteie cotações para o vendedor certo com base em especialidade, carga e histórico. Fatie cotações grandes por especialidade." },
      { property: "og:title", content: "Orquestração comercial — USE Medical" },
      { property: "og:description", content: "Camada de decisão: quem responde cada cotação, e como fatiar as grandes." },
    ],
  }),
  component: OrquestracaoPage,
});

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function OrquestracaoPage() {
  return (
    <PermissionGate perm="quotes.respond" title="Orquestração restrita">
      <OrquestracaoInner />
    </PermissionGate>
  );
}

function OrquestracaoInner() {
  const { quotes, reassignQuote } = useQuotes();
  const [applied, setApplied] = useState<Set<string>>(new Set());

  const plans = useMemo(() => planAutoAssignments(quotes, OWNERS, 15), [quotes]);
  const splitCandidates = useMemo(
    () =>
      quotes
        .filter((q) => q.items.length >= 6 && (q.status === "aguardando_precificacao" || q.status === "pending_review"))
        .map((q) => ({ q, split: splitLargeQuote(q, quotes, OWNERS) }))
        .filter((x) => x.split && x.split.slices.length >= 2)
        .slice(0, 5),
    [quotes],
  );

  const ownerStats = useMemo(
    () =>
      OWNERS.map((o) => ({
        owner: o,
        specialty: buildOwnerSpecialty(quotes, o.id),
        load: buildOwnerLoad(quotes, o.id),
      })),
    [quotes],
  );

  function applyPlan(quoteId: string, toOwner: string) {
    reassignQuote(quoteId, toOwner);
    setApplied((s) => new Set(s).add(quoteId));
    toast.success(`Cotação ${quoteId.toUpperCase()} reatribuída`);
  }

  function applyAll() {
    plans.forEach((p) => reassignQuote(p.quote_id, p.to_owner));
    setApplied(new Set(plans.map((p) => p.quote_id)));
    toast.success(`${plans.length} reatribuições aplicadas`);
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onReset={() => {}} />
      <main className="mx-auto max-w-[1600px] space-y-4 px-3 py-4 sm:px-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
              <Radar className="h-5 w-5 text-brand" /> Orquestração comercial
            </h1>
            <p className="text-xs text-muted-foreground">
              Quem responde cada cotação, com base em especialidade, carga e histórico com o cliente.
            </p>
          </div>
          {plans.length > 0 && (
            <Button size="sm" className="gap-1.5" onClick={applyAll}>
              <Sparkles className="h-4 w-4" /> Aplicar {plans.length} recomendação{plans.length > 1 ? "s" : ""}
            </Button>
          )}
        </div>

        <section className="rounded-lg border bg-card p-3 card-shadow">
          <div className="mb-2 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">Time — especialidade e carga atual</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
            {ownerStats.map(({ owner, specialty, load }) => {
              const overload = load.pressure >= 8;
              return (
                <div key={owner.id} className="rounded-md border bg-background p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-sm font-semibold text-foreground">{owner.name}</div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {owner.territory}
                      </div>
                    </div>
                    <Badge variant={overload ? "destructive" : "outline"} className="text-[10px]">
                      {load.open_count} abertas
                    </Badge>
                  </div>
                  <div className="mt-2 space-y-1 text-[11px]">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Win-rate</span>
                      <span className="font-semibold text-foreground">
                        {(specialty.win_rate * 100).toFixed(0)}%
                        <span className="ml-1 text-muted-foreground">
                          ({specialty.wins_total}/{specialty.wins_total + specialty.losses_total})
                        </span>
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Ticket médio ganho</span>
                      <span className="font-medium text-foreground">{brl(specialty.avg_ticket_won)}</span>
                    </div>
                  </div>
                  {specialty.strong_keywords.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {specialty.strong_keywords.map((k) => (
                        <span
                          key={k}
                          className="rounded bg-brand/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-brand"
                        >
                          {k}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        <section className="rounded-lg border bg-card p-3 card-shadow">
          <div className="mb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-brand" />
              <h2 className="text-sm font-semibold text-foreground">Recomendações de roteamento</h2>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              min. vantagem 15 pts
            </span>
          </div>
          {plans.length === 0 ? (
            <p className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
              Nada a mover — o roteamento atual está dentro da margem esperada.
            </p>
          ) : (
            <div className="space-y-2">
              {plans.map((p) => {
                const q = quotes.find((qq) => qq.id === p.quote_id);
                if (!q) return null;
                const from = ownerById(p.from_owner);
                const to = ownerById(p.to_owner);
                const done = applied.has(p.quote_id);
                return (
                  <div
                    key={p.quote_id}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-md border bg-background p-3 text-xs",
                      done && "opacity-60",
                    )}
                  >
                    <Link
                      to="/inbox"
                      search={{ open: q.id }}
                      className="min-w-[10rem] font-mono font-semibold text-primary hover:underline"
                    >
                      #{q.id.toUpperCase()}
                    </Link>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{q.customer_name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {q.customer_segment} · {q.items.length} item(ns) · {brl(quoteTotals(q.items).revenue)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-muted-foreground line-through">{from.name}</span>
                      <ArrowRight className="h-3 w-3 text-brand" />
                      <span className="font-semibold text-foreground">{to.name}</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {p.reasons.slice(0, 2).map((r, i) => (
                        <span key={i} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {r}
                        </span>
                      ))}
                    </div>
                    <Badge variant="secondary" className="text-[10px]">
                      score {p.score.toFixed(0)}
                    </Badge>
                    <Button
                      size="sm"
                      variant={done ? "ghost" : "default"}
                      disabled={done}
                      onClick={() => applyPlan(p.quote_id, p.to_owner)}
                    >
                      {done ? "Aplicado" : "Reatribuir"}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-lg border bg-card p-3 card-shadow">
          <div className="mb-2 flex items-center gap-2">
            <GitFork className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground">Cotações grandes para fatiar</h2>
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
              6+ itens · múltiplas especialidades
            </span>
          </div>
          {splitCandidates.length === 0 ? (
            <p className="rounded border border-dashed p-4 text-center text-xs text-muted-foreground">
              Nenhuma cotação grande com afinidade de especialidade dividida.
            </p>
          ) : (
            <div className="space-y-2">
              {splitCandidates.map(({ q, split }) => (
                <div key={q.id} className="rounded-md border bg-background p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Link
                      to="/inbox"
                      search={{ open: q.id }}
                      className="font-mono text-xs font-semibold text-primary hover:underline"
                    >
                      #{q.id.toUpperCase()} · {q.customer_name}
                    </Link>
                    <span className="text-[11px] text-muted-foreground">{split!.reason}</span>
                  </div>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {split!.slices.map((s) => (
                      <div key={s.owner.id} className="rounded border bg-card p-2 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{s.owner.name}</span>
                          <span className="text-muted-foreground">{brl(s.revenue)}</span>
                        </div>
                        <div className="mt-0.5 text-[10px] text-muted-foreground">{s.reason}</div>
                        <ul className="mt-1 list-disc pl-4 text-[10px] text-muted-foreground">
                          {s.items.slice(0, 3).map((it, i) => (
                            <li key={i} className="truncate">
                              {it.quantity}× {it.name}
                            </li>
                          ))}
                          {s.items.length > 3 && <li>+{s.items.length - 3}</li>}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
      <Toaster position="top-right" richColors />
    </div>
  );
}
