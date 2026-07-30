import type { Quote, QuoteItem } from "./types";
import { COMPLIANCE_DATA, type ComplianceRecord } from "./compliance-data";

export type ComplianceStatus = "ok" | "warning" | "blocked" | "overridden";

export interface ComplianceCheck {
  sku: string;
  status: ComplianceStatus;
  anvisa_code?: string;
  cmed_pmc?: number;
  reason?: string;
  original_status?: ComplianceStatus;
}

export interface ComplianceReport {
  status: ComplianceStatus;
  checks: ComplianceCheck[];
  blocked_count: number;
  warning_count: number;
  overridden_count: number;
  summary: string;
}

const ANVISA_RE = /^\d{13}$/;

function recordFor(sku: string): ComplianceRecord | undefined {
  return COMPLIANCE_DATA[sku];
}

export function checkItem(item: QuoteItem): ComplianceCheck {
  const rec = recordFor(item.sku);
  if (!rec) {
    return { sku: item.sku, status: "warning", reason: "SKU sem cadastro regulatório" };
  }
  if (!ANVISA_RE.test(rec.anvisa_code)) {
    return {
      sku: item.sku,
      status: "blocked",
      anvisa_code: rec.anvisa_code,
      reason: "Registro ANVISA em formato inválido",
    };
  }
  if (rec.expires_at && new Date(rec.expires_at).getTime() < Date.now()) {
    return {
      sku: item.sku,
      status: "blocked",
      anvisa_code: rec.anvisa_code,
      reason: `Registro ANVISA vencido (${rec.expires_at})`,
    };
  }
  if (rec.cmed_pmc && item.unit_price > rec.cmed_pmc) {
    return {
      sku: item.sku,
      status: "blocked",
      anvisa_code: rec.anvisa_code,
      cmed_pmc: rec.cmed_pmc,
      reason: `Preço acima do teto CMED (PMC ${rec.cmed_pmc.toFixed(2)})`,
    };
  }
  if (rec.cmed_pmc && item.unit_price > rec.cmed_pmc * 0.95) {
    return {
      sku: item.sku,
      status: "warning",
      anvisa_code: rec.anvisa_code,
      cmed_pmc: rec.cmed_pmc,
      reason: "Preço próximo ao teto CMED",
    };
  }
  return { sku: item.sku, status: "ok", anvisa_code: rec.anvisa_code, cmed_pmc: rec.cmed_pmc };
}

export function checkQuote(
  quote: Quote,
  overriddenSkus: ReadonlySet<string> = new Set(),
): ComplianceReport {
  const checks = quote.items.map((it) => {
    const base = checkItem(it);
    if (base.status === "blocked" && overriddenSkus.has(it.sku)) {
      return { ...base, status: "overridden" as const, original_status: "blocked" as const };
    }
    return base;
  });
  const blocked_count = checks.filter((c) => c.status === "blocked").length;
  const warning_count = checks.filter((c) => c.status === "warning").length;
  const overridden_count = checks.filter((c) => c.status === "overridden").length;
  const status: ComplianceStatus =
    blocked_count > 0
      ? "blocked"
      : overridden_count > 0
        ? "overridden"
        : warning_count > 0
          ? "warning"
          : "ok";
  const summary =
    status === "blocked"
      ? `${blocked_count} item(ns) bloqueados por restrição ANVISA/CMED`
      : status === "overridden"
        ? `${overridden_count} bloqueio(s) liberado(s) por gestor sob justificativa`
        : status === "warning"
          ? `${warning_count} item(ns) requerem revisão regulatória`
          : "Todos os itens em conformidade ANVISA/CMED";
  return { status, checks, blocked_count, warning_count, overridden_count, summary };
}

export function cmedCeiling(sku: string): number | undefined {
  return recordFor(sku)?.cmed_pmc;
}
