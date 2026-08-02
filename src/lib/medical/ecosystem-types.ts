// Contratos externos (Fase 3). Tipos + contratos de resposta da Ecosystem API.
// A implementação está em `ecosystem/` (partners, api, bionexo).

export interface EcosystemPartner {
  id: string;
  name: string;
  webhook_secret_ref: string;
  rate_limit_per_min: number;
}

export interface ExternalQuotePayload {
  partner_id: string;
  external_id: string;
  customer: { name: string; segment: string; document?: string };
  items: Array<{ sku: string; quantity: number; target_price?: number }>;
  metadata?: Record<string, string | number | boolean>;
}

export interface ErpFieldMapping {
  source: string;
  endpoint: string;
  auth: { type: "bearer" | "basic" | "hmac"; secret_ref: string };
  map: Record<string, string>; // JSONPath expressions
}

export interface EcosystemOrderCallback {
  partner_id: string;
  order_id: string;
  status: "confirmed" | "shipped" | "delivered" | "cancelled";
  occurred_at: string;
}

// ---------- Respostas da Ecosystem API ----------

export interface EcosystemQuoteResult {
  ok: boolean;
  quote_id?: string;
  external_id?: string;
  status?: string;
  origin_partner_id?: string;
  error?: string;
}

export interface EcosystemCatalogItem {
  id: string;
  sku: string;
  name: string;
  unit: string;
}

export interface EcosystemCatalogResult {
  ok: boolean;
  total: number;
  limit: number;
  offset: number;
  items: EcosystemCatalogItem[];
}

export interface EcosystemCallbackResult {
  ok: boolean;
  order_id?: string;
  status?: string;
  error?: string;
}

