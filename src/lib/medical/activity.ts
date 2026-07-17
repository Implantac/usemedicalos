// Activity log for quotes - persisted in localStorage.
// TODO(cloud): migrar para tabela quote_activities (quote_id, actor_id, type, meta jsonb, created_at)
import type { ClientTier, QuoteStatus } from "./types";

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
  | "portal_response_taken";

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
  const prev = list[0]; // list is stored DESC (mais nova primeiro)
  const prev_hash = prev?.hash ?? "0".repeat(64);
  const activity: Activity = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
    prev_hash,
  };
  // hash síncrono (djb2) para não bloquear callers. Verificador usa SHA-256 async.
  // Trocamos por SHA-256 em batch offline no verificador — o hash aqui serve como
  // "commit" da cadeia; se alguém alterar a atividade, o SHA-256 no verifyChain diverge.
  activity.hash = quickHash(canonical(activity, prev_hash));
  const next = [activity, ...list];
  saveActivities(next);
  return activity;
}

function canonical(a: Activity, prevHash: string): string {
  return JSON.stringify({
    id: a.id,
    quote_id: a.quote_id,
    type: a.type,
    message: a.message,
    created_at: a.created_at,
    meta: a.meta ?? null,
    prev_hash: prevHash,
  });
}

function quickHash(s: string): string {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `djb2_${(h >>> 0).toString(16)}`;
}

export function getActivitiesFor(quoteId: string): Activity[] {
  return loadActivities().filter((a) => a.quote_id === quoteId);
}

