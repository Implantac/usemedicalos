import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, SOURCE_LABEL, STATUS_LABEL, type Priority, type QuoteStatus, type SourceType } from "@/lib/medical/types";

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, string> = {
    pending_review: "bg-brand/15 text-brand border-brand/30",
    aguardando_precificacao: "bg-warning/15 text-warning-foreground border-warning/30",
    em_negociacao: "bg-primary/10 text-primary border-primary/25",
    enviado: "bg-success/15 text-success border-success/30",
    ganho: "bg-success text-success-foreground border-transparent",
    perdido: "bg-muted text-muted-foreground border-transparent",
  };
  return (
    <Badge variant="outline" className={cn("font-medium rounded-full px-2 py-0.5 text-[11px] tracking-tight transition-colors", map[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    urgente: "bg-danger text-danger-foreground shadow-sm",
    alta: "bg-danger/15 text-danger border-danger/30",
    normal: "bg-secondary text-secondary-foreground",
    baixa: "bg-muted text-muted-foreground",
  };
  const dot: Record<Priority, string> = {
    urgente: "bg-danger-foreground/90",
    alta: "bg-danger",
    normal: "bg-muted-foreground/60",
    baixa: "bg-muted-foreground/40",
  };
  return (
    <Badge variant="outline" className={cn("font-medium rounded-full px-2 py-0.5 text-[11px] gap-1.5 border-transparent", map[priority])}>
      <span className={cn("size-1.5 rounded-full", dot[priority])} />
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export function SourceTag({ source }: { source: SourceType }) {
  const map: Record<SourceType, { bg: string; text: string; border: string }> = {
    email: { bg: "bg-sky-500/10", text: "text-sky-600", border: "border-sky-500/25" },
    whatsapp: { bg: "bg-emerald-500/10", text: "text-emerald-600", border: "border-emerald-500/25" },
    portal: { bg: "bg-orange-500/10", text: "text-orange-600", border: "border-orange-500/25" },
    telefone: { bg: "bg-violet-500/10", text: "text-violet-600", border: "border-violet-500/25" },
    edi: { bg: "bg-slate-500/10", text: "text-slate-600", border: "border-slate-500/25" },
  };
  const style = map[source];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider", style.bg, style.text, style.border)}>
      {SOURCE_LABEL[source]}
    </span>
  );
}
