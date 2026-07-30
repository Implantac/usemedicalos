// Painel visual do Motor de Precificação: renderiza as 4 camadas resolvidas.

import { AlertTriangle, CheckCircle2, ShieldAlert, TrendingDown } from "lucide-react";
import type { ClientTier, Product } from "@/lib/medical/types";
import { calculateSuggestedPrice, PRICING_STATUS_LABEL } from "@/lib/medical/pricing-engine";
import { formatBRL, formatPct } from "@/lib/medical/pricing";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<string, { cls: string; icon: typeof CheckCircle2 }> = {
  OPTIMAL:          { cls: "border-success/40 bg-success/5 text-success",   icon: CheckCircle2 },
  MARKET_MISSING:   { cls: "border-muted-foreground/30 bg-muted/40 text-muted-foreground", icon: TrendingDown },
  WARNING:          { cls: "border-warning/40 bg-warning/5 text-warning",   icon: AlertTriangle },
  COMPLIANCE_LIMIT: { cls: "border-warning/40 bg-warning/5 text-warning",   icon: ShieldAlert },
  BLOCKED:          { cls: "border-danger/40 bg-danger/5 text-danger",      icon: ShieldAlert },
};

export function PricingEnginePanel({
  product,
  tier = "B",
}: {
  product: Product;
  tier?: ClientTier;
}) {
  const r = calculateSuggestedPrice(product, { tier });
  const tone = STATUS_TONE[r.status];
  const Icon = tone.icon;

  return (
    <div className="space-y-2">
      <div className={cn("flex items-start gap-2 rounded-md border p-2.5", tone.cls)}>
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wide">
              {PRICING_STATUS_LABEL[r.status]}
            </span>
            <span className="num text-lg font-bold text-foreground">
              {formatBRL(r.suggested_price)}
            </span>
          </div>
          <p className="mt-0.5 text-[11px] leading-tight text-foreground/80">{r.reason}</p>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            Margem final <span className={cn("num font-semibold", r.margin < 0.12 ? "text-danger" : "text-success")}>{formatPct(r.margin)}</span>
            {" · "}tier <span className="font-semibold">{tier}</span>
            {r.tier_discount > 0 && <> (−{formatPct(r.tier_discount)})</>}
          </p>
        </div>
      </div>

      <ol className="grid grid-cols-2 gap-1.5 text-[10px] sm:grid-cols-4">
        <Layer n={1} label="Floor" value={formatBRL(r.floor_price)} hint="custo + impostos + logística + 5%" />
        <Layer n={2} label="Teto CMED" value={r.compliance_cap ? formatBRL(r.compliance_cap) : "—"} hint="proteção jurídica" />
        <Layer n={3} label="Mercado" value={r.market_target ? formatBRL(r.market_target) : "—"} hint="market_avg − 2%" />
        <Layer n={4} label="Estratégia" value={r.tier_discount > 0 ? `−${formatPct(r.tier_discount)}` : "—"} hint={`tier ${tier}`} />
      </ol>
    </div>
  );
}

function Layer({ n, label, value, hint }: { n: number; label: string; value: string; hint: string }) {
  return (
    <div className="rounded-md border bg-card p-2">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-primary/10 text-[9px] font-bold text-primary">
          {n}
        </span>
        {label}
      </div>
      <div className="num mt-0.5 text-xs font-bold text-foreground">{value}</div>
      <div className="text-[9px] leading-tight text-muted-foreground">{hint}</div>
    </div>
  );
}
