// Data model mirrors the intended Supabase schema so migration is trivial.
// TODO(cloud): quando Lovable Cloud for ativado, migrar para tabelas com
// organization_id + RLS via is_org_member.

export type SourceType = "email" | "whatsapp" | "portal" | "telefone" | "edi";
export type QuoteStatus =
  | "aguardando_precificacao"
  | "em_negociacao"
  | "enviado"
  | "ganho"
  | "perdido";
export type Priority = "baixa" | "normal" | "alta" | "urgente";

export type ErpType = "use_sistemas" | "totvs_protheus" | "sankhya" | "senior" | "none";

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  erp_type: ErpType;
  region?: string;
}


export interface Owner {
  id: string;
  name: string;
  initials: string;
  territory: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  last_suggested_price: number;
  unit: string;
}

export interface QuoteItem {
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number; // preço proposto pelo vendedor
  cost_price: number;
}

export interface Quote {
  id: string;
  tenant_id: string;
  owner_id: string;
  source_type: SourceType;
  status: QuoteStatus;
  priority: Priority;
  customer_name: string;
  customer_segment: string; // hospital, clínica, distribuidor
  received_at: string; // ISO
  sla_deadline: string; // ISO
  original_payload: string; // texto original recebido
  keywords: string[];
  items: QuoteItem[];
  notes?: string;
  use_sistemas_synced?: boolean;
  use_sistemas_order_id?: string;
}

export interface SlaTracking {
  quote_id: string;
  received_at: string;
  deadline: string;
  first_response_at?: string;
  delivered_at?: string;
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  aguardando_precificacao: "Aguardando Precificação",
  em_negociacao: "Em Negociação",
  enviado: "Enviado",
  ganho: "Ganho",
  perdido: "Perdido",
};

export const PRIORITY_LABEL: Record<Priority, string> = {
  baixa: "Baixa",
  normal: "Normal",
  alta: "Alta",
  urgente: "Urgente",
};

export const SOURCE_LABEL: Record<SourceType, string> = {
  email: "E-mail",
  whatsapp: "WhatsApp",
  portal: "Portal",
  telefone: "Telefone",
  edi: "EDI",
};

export const MIN_MARGIN = 0.12; // 12%
