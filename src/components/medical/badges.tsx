import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  PRIORITY_LABEL,
  SOURCE_LABEL,
  STATUS_LABEL,
  type Priority,
  type QuoteStatus,
  type SourceType,
} from "@/lib/medical/types";

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
    <Badge
      variant="outline"
      className={cn(
        "font-medium rounded-full px-2 py-0.5 text-[11px] tracking-tight transition-colors",
        map[status],
      )}
    >
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
    <Badge
      variant="outline"
      className={cn(
        "font-medium rounded-full px-2 py-0.5 text-[11px] gap-1.5 border-transparent",
        map[priority],
      )}
    >
      <span className={cn("size-1.5 rounded-full", dot[priority])} />
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

/**
 * Selo de origem parceira (Fase 3 — Ecossistema).
 * Exibe o marketplace/portal que originou a cotação via `origin_partner_id`.
 * Sem partner, não renderiza nada (fallback silencioso para cotações internas).
 */
const PARTNER_META: Record<string, { label: string; className: string }> = {
  bionexo: {
    label: "Bionexo",
    className: "border-brand/30 bg-brand/10 text-brand",
  },
  apoio: {
    label: "Apoio Cotação",
    className: "border-primary/30 bg-primary/10 text-primary",
  },
  marketplace_demo: {
    label: "Marketplace",
    className: "border-success/30 bg-success/10 text-success",
  },
};

export function PartnerTag({ partnerId }: { partnerId?: string | null }) {
  if (!partnerId) return null;
  const meta = PARTNER_META[partnerId] ?? {
    label: partnerId.replaceAll("_", " "),
    className: "border-border bg-muted text-muted-foreground",
  };
  return (
    <Badge
      variant="outline"
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        meta.className,
      )}
      title={`Cotação recebida via ${meta.label}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {meta.label}
    </Badge>
  );
}
