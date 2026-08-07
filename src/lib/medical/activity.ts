// Activity log for quotes - persisted in localStorage.
// TODO(cloud): migrar para tabela quote_activities (quote_id, actor_id, type, meta jsonb, created_at)
import type { ClientTier, QuoteStatus } from "./types";
import { GENESIS_HASH, hashActivity } from "./audit-chain";

export type ActivityType =
  | "created"
  | "status_changed"
  | "item_updated"
  | "item_removed"
  | "price_suggested"
  | "notes_updated"
  | "pdf_generated"
  | "sent_use_sistemas"
  | "compliance_override"
  | "compliance_override_revoked"
  | "client_tier_changed"
  | "ingested_from_portal"
  | "portal_response_taken"
| "product_quick_created"
  | "snapshot_sent"
  | "quote_restored"
  | "csv_imported"
  | "quote_lost";

export interface Activity {
  id: string;
  quote_id: string;
  type: ActivityType;
  message: string;
  created_at: string;
  meta?: {
    from?: QuoteStatus;
    to?: QuoteStatus;
    sku?: string;
    order_id?: string;
    reason?: string;
    engine_status?: string;
    tier?: ClientTier;
    source_platform?: string;
    portal_reference?: string;
    /** Snapshot de itens enviado (Melhoria #4). */
    quote_snapshot?: {
      items: {
        sku: string;
        name: string;
        quantity: number;
        unit_price: number;
        cost_price: number;
      }[];
      revenue?: number;
      cost?: number;
    };
    /** Parâmetros do diff para exibição (Melhoria #4). */
    snapshot_diff?: {
      unchanged: boolean;
      changedCount: number;
      revenueDelta: number;
    };
  };
  /** Hash-chain: hash da atividade anterior (imutabilidade auditável). */
  prev_hash?: string;
  /** SHA-256 do payload canônico + prev_hash. */
  hash?: string;
}

const KEY = "use-medical:activities:v1";

export function loadActivities(): Activity[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Activity[]) : [];
  } catch {
    return [];
  }
}

export function saveActivities(list: Activity[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(list.slice(0, 500)));
}

export function appendActivity(entry: Omit<Activity, "id" | "created_at">): Activity {
  const list = loadActivities();
  const prev = list[0]; // DESC
  const prev_hash = prev?.hash ?? GENESIS_HASH;
  const activity: Activity = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    prev_hash,
  };
  activity.hash = hashActivity(activity, prev_hash);
  const next = [activity, ...list];
  saveActivities(next);
  return activity;
}

export function getActivitiesFor(quoteId: string): Activity[] {
  return loadActivities().filter((a) => a.quote_id === quoteId);
}
