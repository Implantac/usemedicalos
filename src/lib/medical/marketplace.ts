// Marketplace de integrações — Camada 3 da visão USE Medical.
// Catálogo unificado de conectores (ERP, Portais de RFQ, Comunicação, IA).
// Estado de instalação é persistido em localStorage; conectores ERP reais
// vêm de `erp-connectors.ts` — aqui expandimos para portais e outros.
//
// Filtro da visão: reduz retrabalho (4) — cada integração deixa de exigir
// um adaptador ad-hoc; e fornece inteligência (5) via portais/IA.

export type MarketplaceCategory = "erp" | "portal" | "comunicacao" | "ia" | "logistica";
export type MarketplaceStatus = "estavel" | "beta" | "planejado";

export interface MarketplaceItem {
  id: string;
  name: string;
  vendor: string;
  category: MarketplaceCategory;
  status: MarketplaceStatus;
  short: string;                     // 1 linha
  description: string;               // parágrafo
  value_props: string[];             // bullets curtos
  route?: string;                    // rota interna se o conector já tem tela
  docs_url?: string;
  requires_cloud?: boolean;          // exige Lovable Cloud ativo
}

export const MARKETPLACE: MarketplaceItem[] = [
  // ---------- ERP ----------
  {
    id: "erp-use-sistemas",
    name: "Use Sistemas",
    vendor: "Use Sistemas",
    category: "erp",
    status: "estavel",
    short: "ERP nativo do ecossistema USE, ingestão via webhook assinado.",
    description:
      "Integração de referência via /api/public/use-sistemas com HMAC-SHA256. Cotações do ERP entram diretamente no pipeline com auto-classify e auto-draft.",
    value_props: ["Ingestão em segundos", "Assinatura HMAC ponta-a-ponta", "Sincronização de pedido bidirecional"],
    route: "/integracoes",
  },
  {
    id: "erp-totvs-protheus",
    name: "TOTVS Protheus",
    vendor: "TOTVS",
    category: "erp",
    status: "beta",
    short: "Adapter REST para SB1/SC5 com template de mapping pronto.",
    description:
      "Conector com preset de mapeamento para as tabelas SA1/SB1/SC5/SC6 do Protheus. Requer usuário técnico somente-leitura.",
    value_props: ["Preset de mapping oficial", "Usuário técnico somente-leitura", "Sincronização em lote"],
    route: "/integracoes",
    docs_url: "https://tdn.totvs.com/display/public/framework/REST",
  },
  {
    id: "erp-sankhya",
    name: "Sankhya Om",
    vendor: "Sankhya",
    category: "erp",
    status: "beta",
    short: "Bearer token JWT, mapeamento por Parceiro/NotaVenda.",
    description: "Refresh automático de token e template pronto para Parceiro → cliente e NotaVenda → cotação.",
    value_props: ["Token com refresh", "Preset Parceiro/NotaVenda"],
    route: "/integracoes",
    docs_url: "https://developer.sankhya.com.br/",
  },
  {
    id: "erp-senior",
    name: "Senior X",
    vendor: "Senior Sistemas",
    category: "erp",
    status: "planejado",
    short: "OAuth2 client credentials — na fila.",
    description: "Suporte planejado para o próximo trimestre. Registre interesse para priorizar sua fila.",
    value_props: ["OAuth2 client credentials", "Roadmap Q2"],
  },
  {
    id: "erp-generic",
    name: "Webhook genérico",
    vendor: "Custom",
    category: "erp",
    status: "estavel",
    short: "Qualquer sistema via POST + JSONPath mapping.",
    description: "Rota pública /api/public/erp/ingest aceita payload arbitrário desde que acompanhado do mapping JSONPath.",
    value_props: ["Sem SDK", "Mapping declarativo", "HMAC opcional"],
    route: "/integracoes",
  },

  // ---------- Portais de RFQ ----------
  {
    id: "portal-bionexo",
    name: "Bionexo",
    vendor: "Bionexo",
    category: "portal",
    status: "beta",
    short: "Captura cotações do portal via Browser Agent + monitor SLA.",
    description:
      "Extensão Chrome faz login com sua sessão e envia as cotações capturadas para a Inbox com HMAC. Portal Monitor mostra latência e alertas.",
    value_props: ["Sem tocar em API oficial", "Captura assinada", "Monitor SLA por portal"],
    route: "/sla-watchdog",
  },
  {
    id: "portal-apoio",
    name: "ApoioCotação",
    vendor: "ApoioCotação",
    category: "portal",
    status: "beta",
    short: "Ingestão via Browser Agent, mesmo padrão do Bionexo.",
    description: "Suporte a login SSO do hospital. Cotações caem no Inbox com tenant identificado.",
    value_props: ["Login SSO respeitado", "Ingestão assinada"],
    route: "/sla-watchdog",
  },
  {
    id: "portal-generico",
    name: "Portal proprietário",
    vendor: "Custom",
    category: "portal",
    status: "estavel",
    short: "Para portais fechados: e-mail forwarder + auto-classify.",
    description:
      "Um endereço mailto único por tenant recebe o e-mail do portal; o classifier extrai itens e cria a cotação.",
    value_props: ["Zero acesso ao portal", "Auto-classify por regex", "Fallback resiliente"],
  },

  // ---------- Comunicação ----------
  {
    id: "comm-whatsapp",
    name: "WhatsApp Business",
    vendor: "Meta",
    category: "comunicacao",
    status: "beta",
    short: "Envia briefing e proposta pelo canal preferido do cliente hospitalar.",
    description:
      "Templates aprovados enviam a proposta assistida com preview e link de rastreio. Confirmações voltam para a activity log.",
    value_props: ["Templates aprovados", "Rastreio de leitura", "Feedback no timeline"],
    requires_cloud: true,
  },
  {
    id: "comm-email",
    name: "Email transacional",
    vendor: "SMTP / Resend",
    category: "comunicacao",
    status: "estavel",
    short: "Envio de proposta em PDF + follow-up automatizado.",
    description: "Já funciona com mailto no cliente e ganha versão server quando o Cloud estiver ativo (Resend).",
    value_props: ["Fallback mailto imediato", "Anexo PDF via jsPDF", "Trilhas de follow-up"],
  },

  // ---------- IA ----------
  {
    id: "ai-copilot",
    name: "Copiloto Comercial",
    vendor: "Lovable AI Gateway",
    category: "ia",
    status: "beta",
    short: "Sugere resposta, resume o cliente e destaca objeções esperadas.",
    description:
      "Modelo com contexto de win-rate, tier e histórico do cliente. Roda pelo AI Gateway sem chave de fornecedor.",
    value_props: ["Latência baixa", "Sem gerência de chaves", "Contexto do cliente injetado"],
    requires_cloud: true,
  },
  {
    id: "ai-price-benchmark",
    name: "Benchmark de preço IA",
    vendor: "Lovable AI Gateway",
    category: "ia",
    status: "planejado",
    short: "Consulta cache de preço público e alerta desvio > 8%.",
    description: "Cross-check leve com preços públicos regulados (CMED) e cache agregado da rede USE.",
    value_props: ["Cache agregado anonimizado", "Alerta de desvio"],
    requires_cloud: true,
  },

  // ---------- Logística ----------
  {
    id: "log-frete",
    name: "Cálculo de frete",
    vendor: "Correios / Freight API",
    category: "logistica",
    status: "planejado",
    short: "Custo de frete real por CEP antes de fechar a proposta.",
    description: "Combina rota do owner com destino do cliente e ajusta a `logistics_rate` do produto.",
    value_props: ["Sem sobrepreço cego", "Ajuste na engine de preço"],
    requires_cloud: true,
  },
];

export const CATEGORY_LABEL: Record<MarketplaceCategory, string> = {
  erp: "ERP",
  portal: "Portais de RFQ",
  comunicacao: "Comunicação",
  ia: "IA",
  logistica: "Logística",
};

// ---------- Instalação (mock local) ----------

const KEY = "use-medical:marketplace:installed:v1";

export function listInstalled(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "[]") as string[];
  } catch {
    return [];
  }
}

export function setInstalled(id: string, installed: boolean) {
  if (typeof window === "undefined") return;
  const cur = new Set(listInstalled());
  if (installed) cur.add(id);
  else cur.delete(id);
  window.localStorage.setItem(KEY, JSON.stringify([...cur]));
  window.dispatchEvent(new CustomEvent("use-medical:marketplace:change"));
}

export function isInstalled(id: string): boolean {
  return listInstalled().includes(id);
}
