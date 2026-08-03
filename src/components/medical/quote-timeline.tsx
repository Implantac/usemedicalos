import { useEffect, useState } from "react";
import { Activity as ActivityIcon, CheckCircle2, FileText, MessageSquare, Package, PackagePlus, Radio, Send, ShieldAlert, ShieldCheck, ShieldOff, Sparkles, TrendingUp, UserCog, Zap } from "lucide-react";
import { getActivitiesFor, loadActivities, type Activity, type ActivityType } from "@/lib/medical/activity";
import { verifyChain, type ChainVerification } from "@/lib/medical/audit-chain";


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
  product_quick_created: PackagePlus,
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
  const [chain, setChain] = useState<ChainVerification | null>(null);

  useEffect(() => {
    setItems(getActivitiesFor(quoteId));
    // Verifica a integridade da cadeia completa (todas as atividades do storage).
    setChain(verifyChain(loadActivities()));
  }, [quoteId, version]);

  if (!items.length) {
    return (
      <div className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
        <ActivityIcon className="mx-auto mb-1 h-4 w-4" />
        Nenhuma atividade registrada ainda.
      </div>
    );
  }

  const brokenIds = new Set((chain?.broken ?? []).map((b) => b.activityId));


  return (
    <div className="space-y-2">
      {chain && (
        <div
          className={`flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-semibold ${
            chain.valid
              ? "border-success/40 bg-success/10 text-success"
              : "border-danger/50 bg-danger/10 text-danger"
          }`}
        >
          {chain.valid ? (
            <ShieldCheck className="h-3 w-3" />
          ) : (
            <ShieldAlert className="h-3 w-3" />
          )}
          {chain.valid
            ? `Audit trail íntegro (${chain.ok}/${chain.total} elos verificados)`
            : `Audit trail comprometido — ${chain.broken.length} elo(s) quebrado(s)`}
        </div>
      )}
      <ol className="relative space-y-2 border-l border-border pl-4">
        {items.map((a) => {
          const Icon = ICONS[a.type] ?? ActivityIcon;
          const isBroken = brokenIds.has(a.id);
          return (
            <li key={a.id} className="relative">
              <span
                className={`absolute -left-[22px] flex h-4 w-4 items-center justify-center rounded-full ${
                  isBroken ? "bg-danger/20 text-danger" : "bg-primary/10 text-primary"
                }`}
              >
                <Icon className="h-2.5 w-2.5" />
              </span>
              <div className="flex items-baseline justify-between gap-2">
                <p className={`text-xs ${isBroken ? "text-danger" : "text-foreground"}`}>
                  {a.message}
                  {isBroken && <span className="ml-1 font-mono text-[10px]">[TAMPERED]</span>}
                </p>
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
    </div>
  );
}

