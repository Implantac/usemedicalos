import { AlertTriangle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export function slaState(deadlineIso: string) {
  const remaining = new Date(deadlineIso).getTime() - Date.now();
  const hours = remaining / 3_600_000;
  if (hours < 0) return { label: `Atrasado ${Math.abs(hours).toFixed(1)}h`, tone: "danger" as const, hours };
  if (hours < 1) return { label: `${Math.round(hours * 60)}min`, tone: "danger" as const, hours };
  if (hours < 4) return { label: `${hours.toFixed(1)}h`, tone: "warning" as const, hours };
  return { label: `${hours.toFixed(0)}h`, tone: "ok" as const, hours };
}

export function SlaIndicator({ deadline, compact = false }: { deadline: string; compact?: boolean }) {
  const s = slaState(deadline);
  const tone =
    s.tone === "danger"
      ? "text-danger"
      : s.tone === "warning"
      ? "text-warning-foreground"
      : "text-muted-foreground";
  const Icon = s.tone === "danger" ? AlertTriangle : Clock;
  return (
    <span className={cn("inline-flex items-center gap-1 num text-xs font-semibold", tone)}>
      <Icon className="h-3.5 w-3.5" />
      {compact ? s.label : `SLA: ${s.label}`}
    </span>
  );
}
