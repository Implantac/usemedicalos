import { useEffect, useState } from "react";
import { Activity as ActivityIcon, CheckCircle2, FileText, MessageSquare, Package, Radio, Send, ShieldCheck, ShieldOff, Sparkles, TrendingUp, UserCog, Zap } from "lucide-react";
import { getActivitiesFor, type Activity, type ActivityType } from "@/lib/medical/activity";

const ICONS: Record<ActivityType, typeof ActivityIcon> = {
  created: Package,
  status_changed: TrendingUp,
  item_updated: Package,
  item_removed: Package,
  price_suggested: Sparkles,
  notes_updated: MessageSquare,
  pdf_generated: FileText,
  sent_use_sistemas: Send,
  compliance_override: ShieldCheck,
  compliance_override_revoked: ShieldOff,
  client_tier_changed: UserCog,
  ingested_from_portal: Radio,
  portal_response_taken: Zap,
};

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "agora";
  if (mins < 60) return `há ${mins} min`;
  const h = Math.round(mins / 60);
  if (h < 24) return `há ${h}h`;
  const d = Math.round(h / 24);
  return `há ${d}d`;
}

interface Props {
  quoteId: string;
  /** bump this number after any mutation to force a refresh */
  version?: number;
}

export function QuoteTimeline({ quoteId, version = 0 }: Props) {
  const [items, setItems] = useState<Activity[]>([]);

  useEffect(() => {
    setItems(getActivitiesFor(quoteId));
  }, [quoteId, version]);

  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
        <ActivityIcon className="mx-auto mb-1 h-4 w-4" />
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  return (
    <ol className="relative space-y-2 border-l border-border pl-4">
      {items.map((a) => {
        const Icon = ICONS[a.type] ?? ActivityIcon;
        return (
          <li key={a.id} className="relative">
            <span className="absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Icon className="h-2.5 w-2.5" />
            </span>
            <div className="flex items-baseline justify-between gap-2">
              <p className="text-xs text-foreground">{a.message}</p>
              <span className="shrink-0 text-[10px] text-muted-foreground">{formatRelative(a.created_at)}</span>
            </div>
            {a.meta?.order_id && (
              <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-success">
                <CheckCircle2 className="h-3 w-3" /> {a.meta.order_id}
              </div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
