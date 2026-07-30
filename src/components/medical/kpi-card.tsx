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
  const chipCls = {
    default: "bg-muted text-muted-foreground",
    success: "bg-success/12 text-success",
    warning: "bg-warning/20 text-warning-foreground",
    danger: "bg-danger/12 text-danger",
    primary: "bg-primary/10 text-primary",
  }[tone];
  const accentCls = {
    default: "before:bg-border",
    success: "before:bg-success/70",
    warning: "before:bg-warning/70",
    danger: "before:bg-danger/70",
    primary: "before:bg-primary/70",
  }[tone];
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg border bg-card p-3 pl-3.5 card-shadow hover-lift",
        "before:absolute before:inset-y-2 before:left-0 before:w-[3px] before:rounded-r-full before:opacity-70",
        accentCls,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        <span className={cn("grid h-6 w-6 shrink-0 place-items-center rounded-md transition-smooth group-hover:scale-105", chipCls)}>
          <Icon className="h-3.5 w-3.5" />
        </span>
      </div>
      <div className={cn("mt-1.5 num text-2xl font-bold leading-none tracking-tight", toneCls)}>{value}</div>
      {hint && <div className="mt-1.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

