import { ArrowDown, ArrowUp, CheckCircle2, RotateCcw } from "lucide-react";
import { formatBRL } from "@/lib/medical/pricing";
import type { QuoteDiff } from "@/lib/medical/snapshot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Diff visual entre a versão enviada (snapshot) e a versão atual dos itens.
 * Destaque em verde (inalterado), vermelho (removido/alterado) e sinais de
 * delta de receita. Inclui botão para restaurar os preços do envio.
 */
export function VersionDiff({ diff, onRestore }: { diff: QuoteDiff; onRestore?: () => void }) {
  const changed = diff.items.filter(
    (d) => !d.stillPresent || d.qtyChanged || d.priceChanged,
  ).length;

  return (
    <div className="rounded-md border border-border bg-card p-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
          Versão enviada vs. atual
        </div>
        {diff.unchanged ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-bold text-success">
            <CheckCircle2 className="h-3 w-3" /> Sem alterações
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-bold text-warning-foreground">
            {changed} item(ns) alterado(s)
          </span>
        )}
      </div>

      <ul className="space-y-1">
        {diff.items.map((it) => {
          const removed = !it.stillPresent;
          const changed = it.priceChanged || it.qtyChanged;
          const tone = removed
            ? "text-danger"
            : changed
              ? "text-warning-foreground"
              : "text-success";
          return (
            <li
              key={it.sku}
              className={cn(
                "flex items-center justify-between gap-2 rounded px-1.5 py-1 text-[11px]",
                removed ? "bg-danger/10" : changed ? "bg-warning/10" : "bg-muted/30",
              )}
            >
              <div className="min-w-0">
                <div className={cn("truncate font-semibold", tone)}>{it.name}</div>
                <div className="text-[10px] text-muted-foreground num">
                  SKU {it.sku}
                  {removed ? " · removido após envio" : ""}
                </div>
              </div>
              <div className="shrink-0 text-right num">
                {removed ? (
                  <span className="text-danger">—</span>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground line-through">
                      {formatBRL(it.sentPrice)}
                    </span>
                    {it.priceChanged && <DeltaIcon positive={it.currentPrice > it.sentPrice} />}
                    <span className={cn("font-bold", changed ? "text-foreground" : "text-success")}>
                      {formatBRL(it.currentPrice)}
                    </span>
                  </div>
                )}
                {!removed && (
                  <div className="text-[10px] text-muted-foreground">
                    qtd {it.sentQty} → {it.currentQty}
                  </div>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/60 pt-2">
        <div className="text-[11px] text-muted-foreground">
          Receita:{" "}
          <span
            className={cn(
              "num font-bold",
              diff.revenueDelta > 0
                ? "text-success"
                : diff.revenueDelta < 0
                  ? "text-danger"
                  : "text-foreground",
            )}
          >
            {diff.revenueDelta > 0 ? "+" : ""}
            {formatBRL(diff.revenueDelta)}
          </span>
        </div>
        {onRestore && !diff.unchanged && (
          <Button size="sm" variant="outline" className="h-7 gap-1 text-[11px]" onClick={onRestore}>
            <RotateCcw className="h-3 w-3" /> Restaurar preços do envio
          </Button>
        )}
      </div>
    </div>
  );
}

function DeltaIcon({ positive }: { positive: boolean }) {
  const Icon = positive ? ArrowUp : ArrowDown;
  return <Icon className={cn("h-3 w-3", positive ? "text-success" : "text-danger")} />;
}
