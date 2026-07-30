// Contratos externos (Fase 3). Sem implementação — apenas tipos.

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
