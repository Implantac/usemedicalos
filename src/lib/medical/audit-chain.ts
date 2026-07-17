// Audit trail imutável via hash-chain determinístico.
// Cada atividade recebe `prev_hash` (hash da anterior) e `hash` (djb2 sobre payload+prev_hash).
// Nota: djb2 é rápido e determinístico — suficiente para detectar tampering local (edição de
// localStorage, remoção de linha). Em produção server-side (Cloud) a mesma cadeia é
// re-hashada com SHA-256 dentro de um trigger PostgreSQL, garantindo integridade forte.
import type { Activity } from "./activity";

export const GENESIS_HASH = "0".repeat(64);

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

export function hashActivity(a: Activity, prevHash: string): string {
  const s = canonical(a, prevHash);
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return `djb2_${(h >>> 0).toString(16)}`;
}

export interface ChainVerification {
  total: number;
  ok: number;
  broken: { activityId: string; reason: "prev_hash" | "hash" | "missing" }[];
  valid: boolean;
}

export function verifyChain(entries: Activity[]): ChainVerification {
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const broken: ChainVerification["broken"] = [];
  let prev = GENESIS_HASH;
  let ok = 0;
  for (const e of sorted) {
    if (!e.hash) {
      broken.push({ activityId: e.id, reason: "missing" });
      prev = GENESIS_HASH;
      continue;
    }
    const chainPrev = e.prev_hash ?? GENESIS_HASH;
    if (chainPrev !== prev) {
      broken.push({ activityId: e.id, reason: "prev_hash" });
    } else {
      const expected = hashActivity(e, prev);
      if (expected !== e.hash) broken.push({ activityId: e.id, reason: "hash" });
      else ok += 1;
    }
    prev = e.hash;
  }
  return { total: sorted.length, ok, broken, valid: broken.length === 0 };
}
