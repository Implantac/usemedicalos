import { type ReactNode } from "react";
import { Sparkles, ArrowRight, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface IaInsightBarProps {
  message: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: "brand" | "success" | "warning" | "info" | "danger";
  className?: string;
  icon?: ReactNode;
  title?: string;
}

const variantStyles: Record<string, string> = {
  brand: "border-brand/30 bg-brand/5 text-brand",
  success: "border-success/30 bg-success/5 text-success",
  warning: "border-warning/30 bg-warning/5 text-warning-foreground",
  info: "border-primary/20 bg-primary/5 text-primary",
  danger: "border-danger/30 bg-danger/5 text-danger",
};

const iconBg: Record<string, string> = {
  brand: "bg-brand/10",
  success: "bg-success/10",
  warning: "bg-warning/10",
  info: "bg-primary/10",
  danger: "bg-danger/10",
};

export function IaInsightBar({
  message,
  subtitle,
  actionLabel,
  onAction,
  variant = "brand",
  className,
  icon,
  title,
}: IaInsightBarProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-smooth",
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span
          className={cn(
            "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
            iconBg[variant],
          )}
        >
          {icon ?? <Sparkles className="h-4 w-4" />}
        </span>
        <div className="min-w-0 flex-1">
          {title && (
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider">
              <Lightbulb className="h-3 w-3" />
              {title}
            </div>
          )}
          <p className="text-sm font-medium">{message}</p>
          {subtitle && (
            <p className="mt-0.5 text-xs opacity-80">{subtitle}</p>
          )}
        </div>
      </div>
      {actionLabel && onAction && (
        <Button
          size="sm"
          variant="ghost"
          onClick={onAction}
          className={cn(
            "h-8 shrink-0 gap-1 whitespace-nowrap text-xs font-semibold",
            "hover:bg-black/5 dark:hover:bg-white/10",
          )}
        >
          {actionLabel} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      )}
    </div>
  );
}

export function IaInsightInline({
  message,
  variant = "brand",
}: {
  message: string;
  variant?: IaInsightBarProps["variant"];
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium",
        variantStyles[variant],
      )}
    >
      <Sparkles className="h-3 w-3" />
      {message}
    </span>
  );
}
