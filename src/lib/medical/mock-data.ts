import type { Owner, Product, Quote, Tenant } from "./types";
import { classify, slaHoursFor } from "./classifier";

export const TENANTS: Tenant[] = [
  { id: "tnt_use_medical", name: "USE Medical Distribuidora", cnpj: "12.345.678/0001-90" },
  { id: "tnt_med_sul", name: "MedSul Hospitalar", cnpj: "23.456.789/0001-11" },
  { id: "tnt_bio_norte", name: "BioNorte Distribuição", cnpj: "34.567.890/0001-22" },
];

export const TENANT: Tenant = TENANTS[0];

export function tenantById(id: string): Tenant {
  return TENANTS.find((t) => t.id === id) ?? TENANTS[0];
}

export const OWNERS: Owner[] = [
  { id: "u_ana", name: "Ana Ribeiro", initials: "AR", territory: "SP Capital" },
  { id: "u_bruno", name: "Bruno Salles", initials: "BS", territory: "SP Interior" },
  { id: "u_carla", name: "Carla Menezes", initials: "CM", territory: "RJ/ES" },
  { id: "u_diego", name: "Diego Farias", initials: "DF", territory: "Sul" },
  { id: "u_eva", name: "Eva Tanaka", initials: "ET", territory: "Nordeste" },
];

export function ownerById(id: string): Owner {
  return OWNERS.find((o) => o.id === id) ?? OWNERS[0];
}

export const PRODUCTS: Product[] = [
  { id: "p1", sku: "SUT-3-0-CT", name: "Fio de Sutura 3-0 c/ Agulha", cost_price: 18.5, last_suggested_price: 27.9, unit: "un" },
  { id: "p2", sku: "LUV-CIR-M", name: "Luva Cirúrgica Estéril M", cost_price: 2.1, last_suggested_price: 3.2, unit: "par" },
  { id: "p3", sku: "SER-20ML", name: "Seringa 20ml Descartável", cost_price: 0.85, last_suggested_price: 1.4, unit: "un" },
  { id: "p4", sku: "CAT-VEN-20G", name: "Cateter Venoso 20G", cost_price: 4.2, last_suggested_price: 6.9, unit: "un" },
  { id: "p5", sku: "MSC-N95", name: "Máscara N95 PFF2", cost_price: 3.5, last_suggested_price: 5.5, unit: "un" },
  { id: "p6", sku: "GZE-EST-10", name: "Gaze Estéril 10x10cm", cost_price: 1.1, last_suggested_price: 1.9, unit: "un" },
  { id: "p7", sku: "SOR-FIS-500", name: "Soro Fisiológico 500ml", cost_price: 4.8, last_suggested_price: 7.2, unit: "un" },
  { id: "p8", sku: "PRT-CIR-COMP", name: "Prótese Cirúrgica Composta", cost_price: 890, last_suggested_price: 1450, unit: "un" },
];

function hoursAgo(h: number) {
  return new Date(Date.now() - h * 3600 * 1000).toISOString();
}
function hoursFromNow(h: number) {
  return new Date(Date.now() + h * 3600 * 1000).toISOString();
}

function build(
  id: string,
  overrides: Partial<Quote> &
    Pick<Quote, "customer_name" | "customer_segment" | "source_type" | "original_payload" | "items" | "owner_id">,
  receivedHoursAgo: number,
): Quote {
  const cls = classify(overrides.original_payload);
  const sla = slaHoursFor(cls.priority);
  return {
    id,
    tenant_id: TENANT.id,
    status: "aguardando_precificacao",
    priority: cls.priority,
    keywords: cls.keywords,
    received_at: hoursAgo(receivedHoursAgo),
    sla_deadline: hoursFromNow(sla - receivedHoursAgo),
    notes: "",
    totvs_synced: false,
    ...overrides,
  };
}

const TENANT_ASSIGNMENT: Record<string, string> = {
  q2: "tnt_med_sul",
  q4: "tnt_bio_norte",
  q6: "tnt_med_sul",
  q8: "tnt_bio_norte",
};
    status: "aguardando_precificacao",
    priority: cls.priority,
    keywords: cls.keywords,
    received_at: hoursAgo(receivedHoursAgo),
    sla_deadline: hoursFromNow(sla - receivedHoursAgo),
    notes: "",
    totvs_synced: false,
    ...overrides,
  };
}

export const INITIAL_QUOTES: Quote[] = [
  build("q1", {
    owner_id: "u_ana",
    customer_name: "Hospital Santa Clara",
    customer_segment: "Hospital privado",
    source_type: "email",
    original_payload:
      "Solicitação URGENTE de material para cirurgia amanhã cedo. UTI precisa reposição imediata.",
    items: [
      { product_id: "p1", sku: "SUT-3-0-CT", name: "Fio de Sutura 3-0 c/ Agulha", quantity: 40, unit_price: 27.9, cost_price: 18.5 },
      { product_id: "p2", sku: "LUV-CIR-M", name: "Luva Cirúrgica Estéril M", quantity: 200, unit_price: 3.2, cost_price: 2.1 },
    ],
  }, 1),
  build("q2", {
    owner_id: "u_bruno",
    customer_name: "Clínica Vida Plena",
    customer_segment: "Clínica",
    source_type: "whatsapp",
    original_payload:
      "Boa tarde, preciso cotar cateteres e seringas para reposição de estoque mensal.",
    items: [
      { product_id: "p3", sku: "SER-20ML", name: "Seringa 20ml Descartável", quantity: 500, unit_price: 1.4, cost_price: 0.85 },
      { product_id: "p4", sku: "CAT-VEN-20G", name: "Cateter Venoso 20G", quantity: 150, unit_price: 6.9, cost_price: 4.2 },
    ],
  }, 6),
  build("q3", {
    owner_id: "u_carla",
    customer_name: "Prefeitura de Aracruz",
    customer_segment: "Órgão público",
    source_type: "portal",
    original_payload:
      "Pregão eletrônico 042/2026 — cotação para lote de EPIs. Alta complexidade documental.",
    items: [
      { product_id: "p5", sku: "MSC-N95", name: "Máscara N95 PFF2", quantity: 2000, unit_price: 5.1, cost_price: 3.5 },
      { product_id: "p6", sku: "GZE-EST-10", name: "Gaze Estéril 10x10cm", quantity: 5000, unit_price: 1.9, cost_price: 1.1 },
    ],
  }, 20),
  build("q4", {
    owner_id: "u_diego",
    customer_name: "Hospital Regional Norte",
    customer_segment: "Hospital público",
    source_type: "email",
    original_payload:
      "Cotação de soro fisiológico para reposição semanal — prioridade normal.",
    items: [
      { product_id: "p7", sku: "SOR-FIS-500", name: "Soro Fisiológico 500ml", quantity: 300, unit_price: 7.2, cost_price: 4.8 },
    ],
  }, 10),
  build("q5", {
    owner_id: "u_ana",
    customer_name: "Instituto Ortopédico Alpha",
    customer_segment: "Hospital especializado",
    source_type: "email",
    original_payload:
      "Cirurgia programada — prótese consignada, alta complexidade. Prazo apertado.",
    items: [
      { product_id: "p8", sku: "PRT-CIR-COMP", name: "Prótese Cirúrgica Composta", quantity: 2, unit_price: 1450, cost_price: 890 },
      { product_id: "p1", sku: "SUT-3-0-CT", name: "Fio de Sutura 3-0 c/ Agulha", quantity: 20, unit_price: 27.9, cost_price: 18.5 },
    ],
  }, 3),
  {
    ...build("q6", {
      owner_id: "u_eva",
      customer_name: "Farmácia Hospitalar Sul",
      customer_segment: "Distribuidor",
      source_type: "edi",
      original_payload: "Reposição de gaze e seringas — pedido recorrente.",
      items: [
        { product_id: "p6", sku: "GZE-EST-10", name: "Gaze Estéril 10x10cm", quantity: 1000, unit_price: 1.85, cost_price: 1.1 },
        { product_id: "p3", sku: "SER-20ML", name: "Seringa 20ml Descartável", quantity: 800, unit_price: 1.35, cost_price: 0.85 },
      ],
    }, 30),
    status: "em_negociacao",
  },
  {
    ...build("q7", {
      owner_id: "u_bruno",
      customer_name: "Hospital São Lucas",
      customer_segment: "Hospital privado",
      source_type: "whatsapp",
      original_payload: "Segue proposta aceita, aguardando confirmação do faturamento.",
      items: [
        { product_id: "p2", sku: "LUV-CIR-M", name: "Luva Cirúrgica Estéril M", quantity: 400, unit_price: 3.15, cost_price: 2.1 },
      ],
    }, 48),
    status: "enviado",
  },
  {
    ...build("q8", {
      owner_id: "u_carla",
      customer_name: "Hospital Metropolitano",
      customer_segment: "Hospital privado",
      source_type: "email",
      original_payload: "Fechamos com concorrente por questão de prazo.",
      items: [
        { product_id: "p4", sku: "CAT-VEN-20G", name: "Cateter Venoso 20G", quantity: 300, unit_price: 6.5, cost_price: 4.2 },
      ],
    }, 96),
    status: "perdido",
  },
  {
    ...build("q9", {
      owner_id: "u_ana",
      customer_name: "Clínica Renascer",
      customer_segment: "Clínica",
      source_type: "portal",
      original_payload: "Pedido aprovado, aguardando NF.",
      items: [
        { product_id: "p7", sku: "SOR-FIS-500", name: "Soro Fisiológico 500ml", quantity: 200, unit_price: 7.4, cost_price: 4.8 },
        { product_id: "p6", sku: "GZE-EST-10", name: "Gaze Estéril 10x10cm", quantity: 400, unit_price: 1.95, cost_price: 1.1 },
      ],
    }, 120),
    status: "ganho",
  },
];
