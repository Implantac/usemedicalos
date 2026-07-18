/**
 * Retention Job (Data Residency).
 *
 * Percorre todas as quotes armazenadas, agrupa por tenant e remove as que
 * estão em status `perdido` há mais de `retention_days` (definido em
 * TenantConfig). Loga cada purga na activity para trilha de auditoria.
 *
 * Roda uma vez por sessão (guardado em sessionStorage) para não travar o
 * boot. Cloud: substituir por Postgres job (pg_cron) que faz o mesmo DELETE
 * respeitando RLS.
 */

import { INITIAL_QUOTES } from "./mock-data";
import { getTenantConfig } from "./tenant-config";
import { appendActivity } from "./activity";
import type { Quote } from "./types";

const QUOTES_KEY = "use-medical:quotes:v2";
const SESSION_KEY = "use-medical:retention:last-run";
const MIN_INTERVAL_MS = 6 * 3600 * 1000; // no máx. 1x a cada 6h por aba

export interface RetentionReport {
  scanned: number;
  purged: number;
  perTenant: Record<string, { purged: number; retention_days: number }>;
}

function loadQuotes(): Quote[] {
  if (typeof window === "undefined") return INITIAL_QUOTES;
  try {
    const raw = window.localStorage.getItem(QUOTES_KEY);
    if (!raw) return INITIAL_QUOTES;
    const parsed = JSON.parse(raw) as Quote[];
    return Array.isArray(parsed) ? parsed : INITIAL_QUOTES;
  } catch {
    return INITIAL_QUOTES;
  }
}

function saveQuotes(quotes: Quote[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(QUOTES_KEY, JSON.stringify(quotes));
}

/** Executa a purga e retorna relatório. Dry-run se `dryRun=true`. */
export function runRetentionJob({ dryRun = false }: { dryRun?: boolean } = {}): RetentionReport {
  const now = Date.now();
  const quotes = loadQuotes();
  const perTenant: RetentionReport["perTenant"] = {};
  const kept: Quote[] = [];

  for (const q of quotes) {
    if (q.status !== "perdido") {
      kept.push(q);
      continue;
    }
    const cfg = getTenantConfig(q.tenant_id);
    const ageDays = (now - new Date(q.received_at).getTime()) / 86_400_000;
    const bucket = (perTenant[q.tenant_id] ??= { purged: 0, retention_days: cfg.retention_days });
    if (ageDays > cfg.retention_days) {
      bucket.purged += 1;
      if (!dryRun) {
        appendActivity({
          quote_id: q.id,
          type: "compliance_override",
          message: `Data Residency: quote purgada após ${Math.round(ageDays)}d (limite ${cfg.retention_days}d, tenant ${q.tenant_id})`,
          meta: { reason: `retention_${cfg.retention_days}d` },
        });
      }
      continue;
    }
    kept.push(q);
  }

  const purged = quotes.length - kept.length;
  if (!dryRun && purged > 0) saveQuotes(kept);

  return { scanned: quotes.length, purged, perTenant };
}

/** Rate-limited: só roda se a última execução foi há > MIN_INTERVAL_MS. */
export function runRetentionIfDue(): RetentionReport | null {
  if (typeof window === "undefined") return null;
  try {
    const last = Number(window.sessionStorage.getItem(SESSION_KEY) ?? "0");
    if (Date.now() - last < MIN_INTERVAL_MS) return null;
    window.sessionStorage.setItem(SESSION_KEY, String(Date.now()));
    return runRetentionJob();
  } catch {
    return null;
  }
}
