// Audit trail imutável via hash-chain (SHA-256 encadeado).
// Cada atividade recebe `prev_hash` (hash da anterior) e `hash` (sobre payload+prev_hash).
// Alterar/remover qualquer nó quebra o chain do ponto em diante — o verificador detecta.
// Nota: rodar no browser via `crypto.subtle`. Server-side (Cloud) usa `node:crypto` equivalente.
import type { Activity } from "./activity";

const encoder = new TextEncoder();

function toHex(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

export async function hashActivity(a: Activity, prevHash: string): Promise<string> {
  // Payload canônico — ordem estável de campos.
  const canonical = JSON.stringify({
    id: a.id,
    quote_id: a.quote_id,
    type: a.type,
    message: a.message,
    created_at: a.created_at,
    meta: a.meta ?? null,
    prev_hash: prevHash,
  });
  if (typeof crypto === "undefined" || !crypto.subtle) {
    // Fallback determinístico (djb2) — sem garantia criptográfica, mas suficiente para testes SSR.
    let h = 5381;
    for (let i = 0; i < canonical.length; i++) h = ((h << 5) + h + canonical.charCodeAt(i)) | 0;
    return `djb2_${(h >>> 0).toString(16)}`;
  }
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(canonical));
  return toHex(digest);
}

export const GENESIS_HASH = "0".repeat(64);

export interface ChainVerification {
  total: number;
  ok: number;
  broken: { activityId: string; expected: string; got: string }[];
  valid: boolean;
}

export async function verifyChain(entries: Activity[]): Promise<ChainVerification> {
  // Ordena ASC por created_at para reconstruir a cadeia.
  const sorted = [...entries].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  const broken: ChainVerification["broken"] = [];
  let prev = GENESIS_HASH;
  let ok = 0;
  for (const e of sorted) {
    const expected = await hashActivity(e, prev);
    const got = e.hash ?? "";
    const chainPrev = e.prev_hash ?? GENESIS_HASH;
    if (chainPrev !== prev || got !== expected) {
      broken.push({ activityId: e.id, expected, got });
    } else {
      ok += 1;
    }
    prev = got || expected;
  }
  return { total: sorted.length, ok, broken, valid: broken.length === 0 };
}
