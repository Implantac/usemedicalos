// Zona de Quarentena: payloads ERP que falharam no mapeamento não podem
// simplesmente sumir — a tese "zero-loss" exige um armazém auditável para
// reprocessar mais tarde.
//
// Fase mock: localStorage. Migração planejada para tabela
// `quote_quarantine` (tenant_id, payload_raw jsonb, reason text, ...).

export interface QuarantineItem {
  id: string;
  received_at: string;
  tenant_id: string | null;
  source: string; // ex: "erp:use_sistemas", "sandbox", "webhook"
  reason: string;
  errors: string[];
  payload_raw: unknown;
  status: "pending" | "reprocessed" | "discarded";
}

const STORAGE_KEY = "use-medical:quarantine:v1";
const EVENT = "use-medical:quarantine:change";

function safeParse(raw: string | null): QuarantineItem[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as QuarantineItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function listQuarantine(): QuarantineItem[] {
  if (typeof window === "undefined") return [];
  return safeParse(window.localStorage.getItem(STORAGE_KEY));
}

function persist(items: QuarantineItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  window.dispatchEvent(new CustomEvent(EVENT));
}

export function quarantine(
  input: Omit<QuarantineItem, "id" | "received_at" | "status">,
): QuarantineItem {
  const item: QuarantineItem = {
    ...input,
    id: `qtn_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    received_at: new Date().toISOString(),
    status: "pending",
  };
  const next = [item, ...listQuarantine()];
  persist(next);
  return item;
}

export function setQuarantineStatus(id: string, status: QuarantineItem["status"]) {
  const next = listQuarantine().map((q) => (q.id === id ? { ...q, status } : q));
  persist(next);
}

export function removeQuarantine(id: string) {
  persist(listQuarantine().filter((q) => q.id !== id));
}

export function clearQuarantine() {
  persist([]);
}

export function subscribeQuarantine(cb: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}
