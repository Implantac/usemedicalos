// Ring-buffer server-side de eventos de ingestão para o "live log" da UI.
// In-memory (per Worker instance) — ok para demo. Quando Cloud ativar,
// substituir por SELECT em `ingest_events` com paginação por `since`.

export interface IngestLogEntry {
  id: string;
  received_at: string;   // ISO — quando o endpoint recebeu
  source_platform: string;
  portal_reference: string;
  customer_name: string;
  item_count: number;
  status: "accepted" | "rejected";
  reason?: string;
  api_key_id?: string;   // últimos 6 chars da key para auditoria
}

const MAX = 200;
const buffer: IngestLogEntry[] = [];

export function pushLog(entry: Omit<IngestLogEntry, "id" | "received_at">): IngestLogEntry {
  const item: IngestLogEntry = {
    ...entry,
    id: `ing_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    received_at: new Date().toISOString(),
  };
  buffer.unshift(item);
  if (buffer.length > MAX) buffer.length = MAX;
  return item;
}

export function readLog(sinceIso?: string): IngestLogEntry[] {
  if (!sinceIso) return buffer.slice();
  const since = new Date(sinceIso).getTime();
  return buffer.filter((e) => new Date(e.received_at).getTime() > since);
}
