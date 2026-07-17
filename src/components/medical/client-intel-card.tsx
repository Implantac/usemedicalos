import { Radio, Target, TrendingUp, Wallet } from "lucide-react";
import { profileFor } from "@/lib/medical/client-intel";
import { SOURCE_PLATFORM_LABEL } from "@/lib/medical/ingestion";
import type { Quote } from "@/lib/medical/types";

interface Props {
  quotes: Quote[];
  customerName: string;
}

export function ClientIntelCard({ quotes, customerName }: Props) {
  const profile = profileFor(quotes, customerName);

  if (!profile || profile.total_quotes < 2) {
    return (
      <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
        <Target className="mb-1 h-4 w-4" />
        Cliente novo — sem histórico suficiente para sugerir tier.
      </div>
    );
  }

  const tierColor =
    profile.suggested_tier === "A"
      ? "bg-success/15 text-success"
      : profile.suggested_tier === "B"
        ? "bg-brand/15 text-brand"
        : "bg-muted text-muted-foreground";

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-semibold text-foreground">Perfil do Cliente</h4>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${tierColor}`}>
          Tier {profile.suggested_tier} sugerido
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2 text-[11px]">
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <TrendingUp className="h-3 w-3" /> Win-rate
          </div>
          <div className="font-semibold">{Math.round(profile.win_rate * 100)}%</div>
          <div className="text-muted-foreground">{profile.wins}/{profile.total_quotes} cotações</div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Wallet className="h-3 w-3" /> Ticket médio
          </div>
          <div className="font-semibold">
            {profile.avg_ticket.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1 text-muted-foreground">
            <Radio className="h-3 w-3" /> Portais
          </div>
          <div className="font-semibold truncate">
            {profile.preferred_platforms.length
              ? profile.preferred_platforms.map((p) => SOURCE_PLATFORM_LABEL[p]).join(", ")
              : "—"}
          </div>
        </div>
      </div>
    </div>
  );
}
