// Activity log for quotes - persisted in localStorage.
// TODO(cloud): migrar para tabela quote_activities (quote_id, actor_id, type, meta jsonb, created_at)
import type { QuoteStatus } from "./types";

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
  | "compliance_override_revoked";

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
  };
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
  const activity: Activity = {
    ...entry,
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: new Date().toISOString(),
  };
  const list = loadActivities();
  const next = [activity, ...list];
  saveActivities(next);
  return activity;
}

export function getActivitiesFor(quoteId: string): Activity[] {
  return loadActivities().filter((a) => a.quote_id === quoteId);
}
