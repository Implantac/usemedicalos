// Domain Events — barramento único de eventos de negócio.
// Objetivo: desacoplar UI de aprendizado/analytics. Toda ação relevante emite
// um evento; consumidores (calibração, flywheel, auditoria, IA) apenas assinam.
// TODO(cloud): publicar no Postgres (tabela domain_events) + realtime channel.

export type DomainEventType =
  | "quote.received"
  | "quote.priced"
  | "quote.sent"
  | "quote.won"
  | "quote.lost"
  | "quote.assigned"
  | "price.overridden"
  | "compliance.blocked"
  | "copilot.draft_generated"
  | "nba.action_taken";

export interface DomainEvent {
  id: string;
  type: DomainEventType;
  at: string; // ISO
  tenant_id?: string;
  quote_id?: string;
  actor?: string;
  payload?: Record<string, unknown>;
}

const STORAGE_KEY = "use-medical:domain-events:v1";
const MAX_EVENTS = 500;

type Handler = (event: DomainEvent) => void;
const handlers = new Map<DomainEventType | "*", Set<Handler>>();

export function onDomainEvent(type: DomainEventType | "*", handler: Handler): () => void {
  const set = handlers.get(type) ?? new Set<Handler>();
  set.add(handler);
  handlers.set(type, set);
  return () => set.delete(handler);
}

export function loadDomainEvents(): DomainEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as DomainEvent[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function persist(events: DomainEvent[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(events.slice(0, MAX_EVENTS)));
  } catch {
    /* quota — evento é best-effort */
  }
}

export function emitDomainEvent(
  type: DomainEventType,
  data: Omit<DomainEvent, "id" | "type" | "at"> = {},
): DomainEvent {
  const event: DomainEvent = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    at: new Date().toISOString(),
    ...data,
  };
  persist([event, ...loadDomainEvents()]);
  handlers.get(type)?.forEach((h) => h(event));
  handlers.get("*")?.forEach((h) => h(event));
  return event;
}

export function clearDomainEvents() {
  if (typeof window !== "undefined") window.localStorage.removeItem(STORAGE_KEY);
}
