// Data model mirrors the intended Supabase schema so migration is trivial.
// TODO(cloud): quando Lovable Cloud for ativado, migrar para tabelas com
// organization_id + RLS via is_org_member.

export type SourceType = "email" | "whatsapp" | "portal" | "telefone" | "edi";
export type QuoteStatus =
  | "pending_review"
  | "aguardando_precificacao"
  | "em_negociacao"
  | "enviado"
  | "ganho"
  | "perdido";
export type Priority = "baixa" | "normal" | "alta" | "urgente";

export type SourcePlatform = "bionexo" | "apoio" | "clickmed" | "portal_gov" | "outro";

export type LossReason =
  | "preco"
  | "prazo"
  | "estoque"
  | "concorrente"
  | "qualidade"
  | "outro";

export const LOSS_REASON_LABEL: Record<LossReason, string> = {
  preco: "Preço",
  prazo: "Prazo",
  estoque: "Estoque",
  concorrente: "Concorrente",
  qualidade: "Qualidade",
  outro: "Outro",
};

export const LOSS_REASONS: LossReason[] = [
  "preco",
  "prazo",
  "estoque",
  "concorrente",
  "qualidade",
  "outro",
];

export interface PortalMeta {
  source_platform: SourcePlatform;
  portal_reference: string;
  portal_opened_at: string; // quando a RFQ apareceu no portal
  ingested_at: string;      // quando nosso engine capturou
  response_at?: string;     // primeira resposta do vendedor
}


export type ErpType = "use_sistemas" | "totvs_protheus" | "sankhya" | "senior" | "none";

export interface Tenant {
  id: string;
  name: string;
  cnpj: string;
  erp_type: ErpType;
  region?: string;
  min_margin?: number;
  target_margin?: number;
}


export interface Owner {
  id: string;
  name: string;
  initials: string;
  territory: string;
}

export type ClientTier = "A" | "B" | "C";

export interface ComplianceFlags {
  anvisa?: boolean;
  controlled?: boolean;
  refrigerated?: boolean;
  special_handling?: boolean;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  cost_price: number;
  last_suggested_price: number;
  unit: string;
  // ===== Motor de Precificação (4 camadas) =====
  tax_rate: number;        // 0.18 = 18% impostos totais
  logistics_rate?: number; // 0.03 = 3% custo logístico (default 3%)
  cmed_ceiling?: number;   // teto CMED / preço governamental
  market_avg?: number;     // preço médio de mercado (atualizado pelo flywheel)
  compliance_flags?: ComplianceFlags;
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
  client_tier?: ClientTier;
  received_at: string; // ISO
  sla_deadline: string; // ISO
  original_payload: string; // texto original recebido
  keywords: string[];
  items: QuoteItem[];
  notes?: string;
  use_sistemas_synced?: boolean;
  use_sistemas_order_id?: string;
  origin_partner_id?: string; // Fase 3 — parceiro do ecossistema (ex.: Bionexo)
  portal_meta?: PortalMeta;
  platform?: string; // Para compatibilidade com UI operacional
  pinned?: boolean;
  snoozed_until?: string; // ISO — cotação some da inbox até essa data
  loss_reason?: LossReason; // motivo da perda (preenchido ao marcar perdido)
}

export interface SlaTracking {
  quote_id: string;
  received_at: string;
  deadline: string;
  first_response_at?: string;
  delivered_at?: string;
}

export const STATUS_LABEL: Record<QuoteStatus, string> = {
  pending_review: "Nova RFQ do portal",
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

// Desconto adicional por tier (Multiplicador_Cliente)
export const CLIENT_TIER_DISCOUNT: Record<ClientTier, number> = {
  A: 0.02, // Tier A → 2% desconto extra
  B: 0.01,
  C: 0,
};
