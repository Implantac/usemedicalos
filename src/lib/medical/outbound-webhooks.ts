// Push proativo de SLA para canais externos (Slack, WhatsApp Business, Teams).
// Fase mock: config em localStorage + fetch direto do browser. Migração:
// mover disparo para server function agendada (Cloud) para garantir entrega
// mesmo com a aba fechada.

import type { Quote } from "./types";

export type OutboundChannel = "slack" | "teams" | "whatsapp" | "webhook";

export interface OutboundSubscription {
  id: string;
  channel: OutboundChannel;
  url: string;
  label: string;
  enabled: boolean;
  created_at: string;
}

export interface OutboundLog {
  id: string;
  subscription_id: string;
  quote_id: string;
  at: string;
  status: "success" | "error";
  info: string;
}

const SUBS_KEY = "use-medical:outbound-subs:v1";
const LOGS_KEY = "use-medical:outbound-logs:v1";
const FIRED_KEY = "use-medical:outbound-fired:v1";
const EVENT = "use-medical:outbound-webhooks:change";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    const p = JSON.parse(raw);
    return p ?? fallback;
  } catch {
    return fallback;
  }
}

export function listSubscriptions(): OutboundSubscription[] {
  if (typeof window === "undefined") return [];
  return safeParse<OutboundSubscription[]>(window.localStorage.getItem(SUBS_KEY), []);
}

export function listLogs(): OutboundLog[] {
  if (typeof window === "undefined") return [];
  return safeParse<OutboundLog[]>(window.localStorage.getItem(LOGS_KEY), []);
}

function persistSubs(subs: OutboundSubscription[]) {
  window.localStorage.setItem(SUBS_KEY, JSON.stringify(subs));
  window.dispatchEvent(new CustomEvent(EVENT));
}
function persistLogs(logs: OutboundLog[]) {
  window.localStorage.setItem(LOGS_KEY, JSON.stringify(logs.slice(0, 200)));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function addSubscription(
  input: Omit<OutboundSubscription, "id" | "created_at" | "enabled"> & { enabled?: boolean },
): OutboundSubscription {
  const sub: OutboundSubscription = {
    id: `sub_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    created_at: new Date().toISOString(),
    enabled: input.enabled ?? true,
    channel: input.channel,
    url: input.url,
    label: input.label,
  };
  persistSubs([sub, ...listSubscriptions()]);
  return sub;
}

export function toggleSubscription(id: string, enabled: boolean) {
  persistSubs(listSubscriptions().map((s) => (s.id === id ? { ...s, enabled } : s)));
}

export function removeSubscription(id: string) {
  persistSubs(listSubscriptions().filter((s) => s.id !== id));
}

function readFired(): Record<string, string[]> {
  if (typeof window === "undefined") return {};
  return safeParse<Record<string, string[]>>(window.localStorage.getItem(FIRED_KEY), {});
}
function writeFired(f: Record<string, string[]>) {
  window.localStorage.setItem(FIRED_KEY, JSON.stringify(f));
}

export function buildSlaMessage(quote: Quote): string {
  const mins = Math.round((Date.now() - new Date(quote.sla_deadline).getTime()) / 60_000);
  return `🚨 SLA atrasado ${mins}min — ${quote.customer_name} · Cotação ${quote.id} (${quote.priority.toUpperCase()})`;
}

function bodyFor(channel: OutboundChannel, text: string) {
  switch (channel) {
    case "slack":
      return { text };
    case "teams":
      return { "@type": "MessageCard", text };
    case "whatsapp":
      return { messaging_product: "whatsapp", type: "text", text: { body: text } };
    default:
      return { text };
  }
}

export async function pushOne(sub: OutboundSubscription, quote: Quote): Promise<OutboundLog> {
  const text = buildSlaMessage(quote);
  const log: OutboundLog = {
    id: `log_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    subscription_id: sub.id,
    quote_id: quote.id,
    at: new Date().toISOString(),
    status: "success",
    info: "",
  };
  try {
    const r = await fetch(sub.url, {
      method: "POST",
      mode: "no-cors", // Slack/Teams costumam bloquear CORS; no-cors nos dá "opaque" ok.
      headers: { "content-type": "application/json" },
      body: JSON.stringify(bodyFor(sub.channel, text)),
    });
    log.info = `HTTP ${r.status || "opaque"}`;
  } catch (e) {
    log.status = "error";
    log.info = (e as Error).message;
  }
  persistLogs([log, ...listLogs()]);
  return log;
}

export async function fireOverdue(
  quotes: Quote[],
  isOverdue: (q: Quote) => boolean,
): Promise<number> {
  const subs = listSubscriptions().filter((s) => s.enabled);
  if (subs.length === 0) return 0;
  const overdue = quotes.filter(isOverdue);
  if (overdue.length === 0) return 0;
  const fired = readFired();
  let dispatched = 0;
  for (const q of overdue) {
    for (const sub of subs) {
      const list = fired[sub.id] ?? [];
      if (list.includes(q.id)) continue;
      await pushOne(sub, q);
      list.push(q.id);
      fired[sub.id] = list.slice(-500);
      dispatched += 1;
    }
  }
  writeFired(fired);
  return dispatched;
}

export function subscribeOutbound(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const h = () => cb();
  window.addEventListener(EVENT, h);
  window.addEventListener("storage", h);
  return () => {
    window.removeEventListener(EVENT, h);
    window.removeEventListener("storage", h);
  };
}
