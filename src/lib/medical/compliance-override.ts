// Manager overrides for compliance blocks.
// Each override is scoped to a specific quote+sku pair, with reason and expiry.
// Persisted em localStorage; migração cloud: tabela compliance_overrides
// (quote_id, sku, manager_id, reason, expires_at) com RLS por tenant.

const KEY = "use-medical:compliance-overrides:v1";

export interface ComplianceOverride {
  quote_id: string;
  sku: string;
  manager_id: string;
  reason: string;
  created_at: string;
  expires_at: string;
}

function read(): ComplianceOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as ComplianceOverride[]) : [];
  } catch {
    return [];
  }
}

function write(list: ComplianceOverride[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(list));
}

function isActive(o: ComplianceOverride): boolean {
  return new Date(o.expires_at).getTime() > Date.now();
}

export function listOverrides(quoteId: string): ComplianceOverride[] {
  return read().filter((o) => o.quote_id === quoteId && isActive(o));
}

export function listAllActiveOverrides(): ComplianceOverride[] {
  return read()
    .filter(isActive)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function hasOverride(quoteId: string, sku: string): boolean {
  return read().some(
    (o) => o.quote_id === quoteId && o.sku === sku && isActive(o),
  );
}

export function addOverride(input: {
  quote_id: string;
  sku: string;
  manager_id: string;
  reason: string;
  ttl_hours?: number;
}): ComplianceOverride {
  const ttl = input.ttl_hours ?? 24;
  const now = new Date();
  const o: ComplianceOverride = {
    quote_id: input.quote_id,
    sku: input.sku,
    manager_id: input.manager_id,
    reason: input.reason,
    created_at: now.toISOString(),
    expires_at: new Date(now.getTime() + ttl * 3600 * 1000).toISOString(),
  };
  const list = read().filter(
    (x) => !(x.quote_id === o.quote_id && x.sku === o.sku),
  );
  list.push(o);
  write(list);
  return o;
}

export function revokeOverride(quoteId: string, sku: string) {
  write(read().filter((o) => !(o.quote_id === quoteId && o.sku === sku)));
}
