// Rate limiter in-memory (token bucket simplificado) para endpoints públicos.
// Nota: instância de Worker é efêmera — quando Lovable Cloud estiver ativo,
// migrar para tabela `public_api_rate` com upsert atômico.

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  /** Janela em milissegundos. Default 60s. */
  windowMs?: number;
  /** Máximo de requests por janela. Default 60. */
  max?: number;
}

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  resetAt: number;
  limit: number;
}

export function rateLimit(key: string, opts: RateLimitOptions = {}): RateLimitResult {
  const windowMs = opts.windowMs ?? 60_000;
  const max = opts.max ?? 60;
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    const fresh: Bucket = { count: 1, resetAt: now + windowMs };
    buckets.set(key, fresh);
    return { ok: true, remaining: max - 1, resetAt: fresh.resetAt, limit: max };
  }

  existing.count += 1;
  const ok = existing.count <= max;
  return {
    ok,
    remaining: Math.max(0, max - existing.count),
    resetAt: existing.resetAt,
    limit: max,
  };
}

export function rateLimitHeaders(res: RateLimitResult): Record<string, string> {
  return {
    "x-ratelimit-limit": String(res.limit),
    "x-ratelimit-remaining": String(res.remaining),
    "x-ratelimit-reset": String(Math.ceil(res.resetAt / 1000)),
  };
}

/** Deriva um identificador razoável do request (IP → header fallback). */
export function clientKey(request: Request, prefix = "anon"): string {
  const h = request.headers;
  const ip =
    h.get("cf-connecting-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  return `${prefix}:${ip}`;
}

/** Apenas para testes. */
export function __resetRateLimit() {
  buckets.clear();
}
