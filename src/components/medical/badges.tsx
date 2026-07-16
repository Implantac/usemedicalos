import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { PRIORITY_LABEL, SOURCE_LABEL, STATUS_LABEL, type Priority, type QuoteStatus, type SourceType } from "@/lib/medical/types";

export function StatusBadge({ status }: { status: QuoteStatus }) {
  const map: Record<QuoteStatus, string> = {
    aguardando_precificacao: "bg-warning/15 text-warning-foreground border-warning/30",
    em_negociacao: "bg-primary/10 text-primary border-primary/25",
    enviado: "bg-success/15 text-success border-success/30",
    ganho: "bg-success text-success-foreground",
    perdido: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-medium", map[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  const map: Record<Priority, string> = {
    urgente: "bg-danger text-danger-foreground",
    alta: "bg-danger/15 text-danger border-danger/30",
    normal: "bg-secondary text-secondary-foreground",
    baixa: "bg-muted text-muted-foreground",
  };
  return (
    <Badge variant="outline" className={cn("font-medium border-transparent", map[priority])}>
      {PRIORITY_LABEL[priority]}
    </Badge>
  );
}

export function SourceTag({ source }: { source: SourceType }) {
  return (
    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {SOURCE_LABEL[source]}
    </span>
  );
}
