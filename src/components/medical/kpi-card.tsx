import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export function KpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: "default" | "success" | "warning" | "danger" | "primary";
}) {
  const toneCls = {
    default: "text-foreground",
    success: "text-success",
    warning: "text-warning-foreground",
    danger: "text-danger",
    primary: "text-primary",
  }[tone];
  return (
    <div className="group relative overflow-hidden rounded-lg border bg-card p-3 card-shadow hover-lift">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <Icon className={cn("h-4 w-4 transition-smooth group-hover:scale-110", toneCls)} />
      </div>
      <div className={cn("mt-1.5 num text-2xl font-bold leading-none tracking-tight", toneCls)}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}
