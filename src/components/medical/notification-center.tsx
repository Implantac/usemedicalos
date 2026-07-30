import { Inbox as InboxIcon, ShieldAlert, Sparkles, Zap } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useQuotes } from "@/hooks/use-quotes";
import { listQuarantine, subscribeQuarantine, type QuarantineItem } from "@/lib/medical/quarantine";
import { cn } from "@/lib/utils";

/**
 * Notification Center — agrega sinais operacionais em um único dropdown:
 * - RFQs pending_review (portal → precisa ser assumido)
 * - Payloads em quarentena (falha de mapeamento ERP)
 *
 * SLA fica em `SlaAlertBell` (dedicado, próximo). Aqui é o "resto da caixa".
 */
export function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [quarItems, setQuarItems] = useState<QuarantineItem[]>([]);
  const { quotes } = useQuotes();

  useEffect(() => {
    setMounted(true);
    setQuarItems(listQuarantine());
    return subscribeQuarantine(() => setQuarItems(listQuarantine()));
  }, []);

  const pending = useMemo(
    () =>
      quotes
        .filter((q) => q.status === "pending_review")
        .sort(
          (a, b) =>
            new Date(b.portal_meta?.ingested_at ?? b.received_at).getTime() -
            new Date(a.portal_meta?.ingested_at ?? a.received_at).getTime(),
        ),
    [quotes],
  );

  const pendingQuar = useMemo(
    () => quarItems.filter((q) => q.status === "pending"),
    [quarItems],
  );

  const total = mounted ? pending.length + pendingQuar.length : 0;
  const tone = pendingQuar.length > 0 ? "danger" : pending.length > 0 ? "brand" : "muted";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative inline-flex h-8 w-8 items-center justify-center rounded-md text-primary-foreground/80 transition-colors hover:bg-primary-foreground/10 hover:text-primary-foreground"
          aria-label={`Notificações (${total})`}
        >
          <Zap className="h-4 w-4" />
          {total > 0 && (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white",
                tone === "danger" ? "bg-danger" : "bg-brand",
              )}
            >
              {total > 9 ? "9+" : total}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="border-b p-3">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Central de notificações
          </div>
          <div className="mt-0.5 text-xs text-foreground">
            {pending.length} RFQ(s) para revisar · {pendingQuar.length} na quarentena
          </div>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {total === 0 && (
            <div className="p-6 text-center text-xs text-muted-foreground">
              Tudo em ordem por aqui. ✨
            </div>
          )}

          {pending.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <Sparkles className="h-3 w-3 text-brand" />
                RFQs capturadas do portal
              </div>
              {pending.slice(0, 5).map((q) => (
                <Link
                  key={q.id}
                  to="/sla-watchdog"
                  onClick={() => setOpen(false)}
                  className="block border-b px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {q.customer_name}
                    </span>
                    <span className="shrink-0 rounded bg-brand/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">
                      {q.portal_meta?.source_platform ?? "portal"}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="truncate">
                      {q.items.length} item(ns) · ref {q.portal_meta?.portal_reference ?? "—"}
                    </span>
                    <span>#{q.id.toUpperCase()}</span>
                  </div>
                </Link>
              ))}
              {pending.length > 5 && (
                <Link
                  to="/sla-watchdog"
                  onClick={() => setOpen(false)}
                  className="block border-b px-3 py-1.5 text-center text-[11px] font-semibold text-brand hover:bg-muted"
                >
                  Ver todas ({pending.length}) no Watchdog →
                </Link>
              )}
            </div>
          )}

          {pendingQuar.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                <ShieldAlert className="h-3 w-3 text-danger" />
                Quarentena — falhas de ingestão
              </div>
              {pendingQuar.slice(0, 5).map((item) => (
                <Link
                  key={item.id}
                  to="/quarentena"
                  onClick={() => setOpen(false)}
                  className="block border-b px-3 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">
                      {item.source}
                    </span>
                    <span className="shrink-0 rounded bg-danger/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-danger">
                      pendente
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {item.reason}
                  </div>
                </Link>
              ))}
              {pendingQuar.length > 5 && (
                <Link
                  to="/quarentena"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-1.5 text-center text-[11px] font-semibold text-danger hover:bg-muted"
                >
                  Reprocessar todas ({pendingQuar.length}) →
                </Link>
              )}
            </div>
          )}
        </div>

        <div className="border-t bg-muted/30 px-3 py-2">
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-muted-foreground hover:text-foreground"
          >
            <InboxIcon className="h-3 w-3" /> Ir para a Inbox
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
