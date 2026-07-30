// AI Dock — camada de IA transversal: presente em qualquer tela.
// Mostra a Próxima Melhor Ação (NBA) sem exigir que o usuário abra o Copiloto.

import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Sparkles, X, ChevronUp, AlertOctagon } from "lucide-react";
import { useQuotes } from "@/hooks/use-quotes";
import { computeNextBestActions, totalAtStake } from "@/lib/medical/next-best-action";
import { formatBRL } from "@/lib/medical/pricing";
import { emitDomainEvent } from "@/lib/medical/domain-events";
import { cn } from "@/lib/utils";

export function AiDock() {
  const { quotes } = useQuotes();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const actions = useMemo(() => computeNextBestActions(quotes, 3), [quotes]);
  const atStake = useMemo(() => totalAtStake(actions), [actions]);

  if (dismissed || actions.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[min(24rem,calc(100vw-2rem))] flex-col items-end gap-2">
      {open && (
        <div className="pointer-events-auto w-full overflow-hidden rounded-xl border border-border bg-card shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="size-4 text-primary" />
              Próxima melhor ação
            </div>
            <button
              aria-label="Fechar painel de IA"
              onClick={() => setDismissed(true)}
              className="rounded p-1 text-muted-foreground hover:bg-accent"
            >
              <X className="size-3.5" />
            </button>
          </div>
          <ul className="divide-y divide-border">
            {actions.map((a) => (
              <li key={a.quote.id}>
                <Link
                  to={a.to}
                  search={a.to === "/inbox" ? { open: a.quote.id } : undefined}
                  onClick={() =>
                    emitDomainEvent("nba.action_taken", {
                      quote_id: a.quote.id,
                      tenant_id: a.quote.tenant_id,
                      payload: { kind: a.kind, impact: a.impact },
                    })
                  }
                  className="flex flex-col gap-1 px-3 py-2.5 transition-colors hover:bg-accent/60"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {a.label} · {a.quote.customer_name}
                    </span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-primary">
                      {formatBRL(a.impact)}
                    </span>
                  </div>
                  <span
                    className={cn(
                      "flex items-center gap-1 text-xs",
                      a.urgency === "critica" ? "text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {a.urgency === "critica" && <AlertOctagon className="size-3" />}
                    {a.reason}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-lg transition-transform hover:scale-[1.02]"
      >
        <Sparkles className="size-4" />
        {actions.length} ação{actions.length > 1 ? "ões" : ""} · {formatBRL(atStake)}
        <ChevronUp className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
    </div>
  );
}
